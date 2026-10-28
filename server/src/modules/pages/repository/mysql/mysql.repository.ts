import type { DatabaseExecutor } from "../../../../db/contracts/executor.interface";
import type { PageAuditSnapshot, PageData, PageListItem } from "../../page.types";
import type { PageListQuery } from "../../schema/page-list.schema";
import { PageReferencedByMenuError } from "../../page.errors";
import { pageConfigSchema } from "../../schema/page-config.schema";
import type { CreatePageData } from "../../schema/page-create.schema";
import type { UpdatePageData } from "../../schema/page-update.schema";
import type { PageRepository } from "../repository.interface";

type StoredPageRow = Omit<PageData, "config"> & {
    config: unknown;
};

export class MySqlPageRepository implements PageRepository {
    constructor(private readonly executor: DatabaseExecutor) {}

    async list({ q, limit, offset }: PageListQuery): Promise<PageListItem[]> {
        const params: unknown[] = [];
        let where = "";
        if (q !== "") {
            // Пользователь ищет буквальное название, а не LIKE-шаблон.
            const escaped = q.replace(/[!%_]/g, (character) => `!${character}`);
            where = "WHERE name LIKE ? ESCAPE '!'";
            params.push(`%${escaped}%`);
        }
        params.push(limit + 1, offset);
        return this.executor.queryRows<PageListItem>(
            `SELECT id AS pageId, name FROM Auto_Admin__pages
             ${where} ORDER BY name ASC, id ASC LIMIT ? OFFSET ?`,
            params,
        );
    }
    async create(config: CreatePageData, userId: number): Promise<number> {
        const result = await this.executor.execute(
            `
                INSERT INTO Auto_Admin__pages
                    (name, description, config, revision, created_by, updated_by)
                VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                config.name,
                config.description,
                JSON.stringify(config.config),
                1,
                userId,
                userId,
            ],
        );
        const id = Number(result.insertId);
        if (!Number.isSafeInteger(id) || id <= 0) {
            throw new Error("Database did not return a created menu id");
        }

        return id;
    }

    async appendAudit(
        pageId: number,
        action: "create" | "update" | "delete",
        actorUserId: number,
        previous: unknown,
        newValue: unknown,
        requestId: string | null,
    ): Promise<void> {
        await this.executor.execute(
            `
                INSERT INTO Auto_Admin__page_audit_events
                    (page_id, action, actor_user_id, previous_value, new_value, request_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                pageId,
                action,
                actorUserId,
                JSON.stringify(previous),
                JSON.stringify(newValue),
                requestId,
            ],
        );
    }

    async get(id: number): Promise<PageData | null> {
        const [row] = await this.executor.queryRows<StoredPageRow>(
            `
                SELECT
                    id as pageId,
                    name,
                    description,
                    config,
                    revision
                FROM Auto_Admin__pages
                    WHERE id = ?
            `,
            [id],
        );

        if (!row) return null;

        const rawConfig =
            typeof row.config === "string"
                ? JSON.parse(row.config)
                : row.config;

        const config = pageConfigSchema.parse(rawConfig);

        return { ...row, config };
    }

    async update(
        id: number,
        data: UpdatePageData,
        userId: number,
    ): Promise<boolean> {
        const row = await this.executor.execute(
            `
                UPDATE Auto_Admin__pages
                SET name = ?,
                    description = ?,
                    config = ?,
                    revision = revision + 1,
                    updated_by = ?
                WHERE id = ? AND revision = ?
            `,
            [data.name, data.description, JSON.stringify(data.config), userId, id, data.revision],
        );

        if (row.affectedRows === 1) return true;
        return false;
    }

    async getForDeletion(id: number): Promise<PageAuditSnapshot | null> {
        const [row] = await this.executor.queryRows<StoredPageRow>(
            `SELECT id AS pageId, name, description, config, revision
             FROM Auto_Admin__pages WHERE id = ? FOR UPDATE`,
            [id],
        );
        if (!row) return null;

        // Для удаления не требуем текущую версию PageConfig: старую страницу
        // можно удалить, сохранив её исходную конфигурацию в аудите.
        const config: unknown = typeof row.config === "string"
            ? JSON.parse(row.config)
            : row.config;
        return { ...row, config };
    }

    async hasMenuReferences(id: number): Promise<boolean> {
        const rows = await this.executor.queryRows<{ id: number }>(
            `SELECT id FROM Auto_Admin__menu WHERE page_id = ? LIMIT 1 FOR UPDATE`,
            [id],
        );
        return rows.length > 0;
    }

    async delete(id: number): Promise<boolean> {
        try {
            const result = await this.executor.execute(
                `DELETE FROM Auto_Admin__pages WHERE id = ?`,
                [id],
            );
            return result.affectedRows === 1;
        } catch (error) {
            // Переводим только известный отказ FK меню. Другие SQL-ошибки
            // сохраняют исходный вид и попадают в глобальный обработчик.
            if (error && typeof error === "object") {
                const code = "code" in error ? error.code : undefined;
                const message = "sqlMessage" in error ? error.sqlMessage
                    : "message" in error ? error.message : undefined;
                if (code === "ER_ROW_IS_REFERENCED_2" &&
                    typeof message === "string" && /\bfk_menu_page\b/.test(message)) {
                    throw new PageReferencedByMenuError(error);
                }
            }
            throw error;
        }
    }
}
