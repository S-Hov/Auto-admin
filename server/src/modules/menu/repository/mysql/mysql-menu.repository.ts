import type { DatabaseExecutor } from "../../../../db/contracts/executor.interface";
import type { MenuRepository } from "../menu-repository.interface";
import type {
    MenuData,
    MenuItem,
    MenuPermissionChange,
    MenuPermissions,
    MenuVisibilityRow,
} from "../../menu.types";

const projection = `m.id, m.parent_id AS parentId, m.name, m.slug, m.icon,
    m.icon_type AS iconType, m.sort_order AS sortOrder, m.is_active AS isActive`;
const normalizeItem = <T extends MenuItem>(row: T): T => ({
    ...row,
    isActive: Boolean(row.isActive),
});

export class MySqlMenuRepository implements MenuRepository {
    constructor(private readonly executor: DatabaseExecutor) {}

    async readAll(forUpdate = false): Promise<MenuItem[]> {
        const rows = await this.executor
            .queryRows<MenuItem>(`SELECT ${projection}
            FROM Auto_Admin__menu m ORDER BY m.sort_order, m.id ${forUpdate ? "FOR UPDATE" : ""}`);
        return rows.map(normalizeItem);
    }

    async readForUser(
        userId: number,
        roleId: number,
    ): Promise<MenuVisibilityRow[]> {
        const rows = await this.executor.queryRows<MenuVisibilityRow>(
            `SELECT ${projection},
            COALESCE(up.can_view, rp.can_view, 0) AS canView,
            COALESCE(up.can_create, rp.can_create, 0) AS canCreate,
            COALESCE(up.can_update, rp.can_update, 0) AS canUpdate,
            COALESCE(up.can_delete, rp.can_delete, 0) AS canDelete
            FROM Auto_Admin__menu m
            LEFT JOIN Auto_Admin__menu_user_permissions up ON up.menu_id = m.id AND up.user_id = ?
            LEFT JOIN Auto_Admin__menu_role_permissions rp ON rp.menu_id = m.id AND rp.role_id = ?
            ORDER BY m.sort_order, m.id`,
            [userId, roleId],
        );
        return rows.map((row) => ({
            ...normalizeItem(row),
            canView: Boolean(row.canView),
            canCreate: Boolean(row.canCreate),
            canUpdate: Boolean(row.canUpdate),
            canDelete: Boolean(row.canDelete),
        }));
    }

    async save(
        data: MenuData,
        actorUserId: number,
        id?: number,
    ): Promise<number> {
        const values = [
            data.parentId,
            data.name,
            data.slug,
            data.icon,
            data.iconType,
            data.sortOrder,
            data.isActive,
            actorUserId,
        ];
        if (id !== undefined) {
            await this.executor.execute(
                `UPDATE Auto_Admin__menu SET parent_id = ?, name = ?, slug = ?, icon = ?,
                icon_type = ?, sort_order = ?, is_active = ?, updated_by = ? WHERE id = ?`,
                [...values, id],
            );
            return id;
        }
        const result = await this.executor.execute(
            `INSERT INTO Auto_Admin__menu
            (parent_id, name, slug, icon, icon_type, sort_order, is_active, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            values,
        );
        const inserted = Number(result.insertId);
        if (!Number.isSafeInteger(inserted) || inserted <= 0)
            throw new Error("Menu insert did not return a safe ID");
        return inserted;
    }

    async delete(id: number): Promise<void> {
        const result = await this.executor.execute(
            "DELETE FROM Auto_Admin__menu WHERE id = ?",
            [id],
        );
        if (result.affectedRows !== 1)
            throw new Error("Menu delete did not affect exactly one item");
    }

    async getPermissions(
        change: MenuPermissionChange,
    ): Promise<MenuPermissions | null> {
        const table =
            change.subjectType === "role"
                ? "Auto_Admin__menu_role_permissions"
                : "Auto_Admin__menu_user_permissions";
        const rows = await this.executor.queryRows<MenuPermissions>(
            `SELECT can_view AS canView, can_create AS canCreate,
            can_update AS canUpdate, can_delete AS canDelete FROM ${table}
            WHERE menu_id = ? AND ${change.subjectType}_id = ? FOR UPDATE`,
            [change.menuId, change.subjectId],
        );
        const row = rows[0];
        return row
            ? {
                  canView: Boolean(row.canView),
                  canCreate: Boolean(row.canCreate),
                  canUpdate: Boolean(row.canUpdate),
                  canDelete: Boolean(row.canDelete),
              }
            : null;
    }

    async setPermissions(change: MenuPermissionChange): Promise<void> {
        const table =
            change.subjectType === "role"
                ? "Auto_Admin__menu_role_permissions"
                : "Auto_Admin__menu_user_permissions";
        if (change.permissions === null) {
            await this.executor.execute(
                `DELETE FROM ${table} WHERE menu_id = ? AND ${change.subjectType}_id = ?`,
                [change.menuId, change.subjectId],
            );
        } else {
            const p = change.permissions;
            const values = [p.canView, p.canCreate, p.canUpdate, p.canDelete];
            await this.executor.execute(
                `INSERT INTO ${table}
                (menu_id, ${change.subjectType}_id, can_view, can_create, can_update, can_delete) VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE can_view = ?, can_create = ?, can_update = ?, can_delete = ?`,
                [change.menuId, change.subjectId, ...values, ...values],
            );
        }
    }

    async appendAudit(
        menuId: number,
        action: "create" | "update" | "delete" | "permission",
        actorUserId: number,
        previous: unknown,
        next: unknown,
        requestId: string | null,
    ): Promise<void> {
        await this.executor.execute(
            `INSERT INTO Auto_Admin__menu_audit_events
            (menu_id, action, actor_user_id, previous_value, new_value, request_id) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                menuId,
                action,
                actorUserId,
                JSON.stringify(previous),
                JSON.stringify(next),
                requestId?.slice(0, 64) ?? null,
            ],
        );
    }
}
