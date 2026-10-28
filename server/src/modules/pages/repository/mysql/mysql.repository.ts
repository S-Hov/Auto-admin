import type { DatabaseExecutor } from "../../../../db/contracts/executor.interface";
import type { PageData } from "../../page.types";
import { pageConfigSchema } from "../../schema/page-config.schema";
import type { CreatePageData } from "../../schema/page-create.schema";
import type { PageRepository } from "../repository.interface";

type StoredPageRow = Omit<PageData, "config"> & {
    config: unknown;
};

export class MySqlPageRepository implements PageRepository {
    constructor(private readonly executor: DatabaseExecutor) {}
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
}
