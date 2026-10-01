import type { DatabaseExecutor } from "../../../../db/contracts/executor.interface";
import type {
    PermissionRuleSubject,
    PermissionRuleSet,
} from "../../contracts/access-control-repository.types";
import type { AccessControlRepository } from "../../contracts/access-control-repository.interface";
import type {
    MySqlFieldPermissionRow,
} from "./mysql-access-control-row.types";
import type { PermissionChange, PermissionTarget, StoredPermission } from "../../contracts/permission-management.types";
import type { PermissionEffect, PermissionSubjectType } from "../../contracts/permission.types";

const tables = {
    role: { resource: "Auto_Admin__role_resource_permissions", field: "Auto_Admin__role_field_permissions" },
    user: { resource: "Auto_Admin__user_resource_permissions", field: "Auto_Admin__user_field_permissions" },
} as const;

export class MySqlAccessControlRepository implements AccessControlRepository {
    constructor(private readonly executor: DatabaseExecutor) {}

    async getPermissionsForUser(
        subject: PermissionRuleSubject,
    ): Promise<PermissionRuleSet> {
        const { userId, roleId } = subject;

        // One statement observes a consistent snapshot of all four rule sets.
        const rows = await this.executor.queryRows<{
            source: "role_resource" | "user_resource" | "role_field" | "user_field";
            target_id: number;
            action: StoredPermission["action"];
            effect: PermissionEffect;
        }>(`
            SELECT 'role_resource' AS source, resource_id AS target_id, action, effect
              FROM Auto_Admin__role_resource_permissions WHERE role_id = ?
            UNION ALL
            SELECT 'user_resource', resource_id, action, effect
              FROM Auto_Admin__user_resource_permissions WHERE user_id = ?
            UNION ALL
            SELECT 'role_field', field_id, action, effect
              FROM Auto_Admin__role_field_permissions WHERE role_id = ?
            UNION ALL
            SELECT 'user_field', field_id, action, effect
              FROM Auto_Admin__user_field_permissions WHERE user_id = ?
        `, [roleId, userId, roleId, userId]);
        const roleResourceRules = rows.filter(row => row.source === "role_resource").map(row => ({ ...row, resource_id: row.target_id }));
        const userResourceRules = rows.filter(row => row.source === "user_resource").map(row => ({ ...row, resource_id: row.target_id }));
        const roleFieldRules = rows.filter(row => row.source === "role_field").map(row => ({ ...row, field_id: row.target_id }));
        const userFieldRules = rows.filter(row => row.source === "user_field").map(row => ({ ...row, field_id: row.target_id }));

        return {
            roleResourceRules: roleResourceRules.map((row) => ({
                resourceId: row.resource_id,
                action: row.action,
                effect: row.effect,
            })),
            userResourceRules: userResourceRules.map((row) => ({
                resourceId: row.resource_id,
                action: row.action,
                effect: row.effect,
            })),
            roleFieldRules: roleFieldRules.map((row) => ({
                fieldId: row.field_id,
                action: row.action as MySqlFieldPermissionRow["action"],
                effect: row.effect,
            })),
            userFieldRules: userFieldRules.map((row) => ({
                fieldId: row.field_id,
                action: row.action as MySqlFieldPermissionRow["action"],
                effect: row.effect,
            })),
        };
    }

    async isActiveSystemAdminForUpdate(userId: number): Promise<boolean> {
        const rows = await this.executor.queryRows<{ isActive: boolean; roleKey: string; rights: string }>(`
            SELECT u.is_active AS isActive, r.\`key\` AS roleKey, r.rights
            FROM Auto_Admin__users u JOIN Auto_Admin__roles r ON r.id = u.role_id
            WHERE u.id = ? FOR UPDATE
        `, [userId]);
        return Boolean(rows[0]?.isActive && rows[0].roleKey === "admin" && rows[0].rights === "full");
    }

    async subjectExists(subjectType: PermissionSubjectType, subjectId: number): Promise<boolean> {
        const table = subjectType === "role" ? "Auto_Admin__roles" : "Auto_Admin__users";
        const rows = await this.executor.queryRows(`SELECT id FROM ${table} WHERE id = ? FOR UPDATE`, [subjectId]);
        return rows.length === 1;
    }

    async getTargetForUpdate(change: PermissionChange): Promise<PermissionTarget | null> {
        const projection = `r.id AS resourceId, r.state AS resourceState,
            r.is_service AS isServiceTable, r.table_name AS tableName, r.object_type AS resourceType`;
        const rows = change.targetType === "resource"
            ? await this.executor.queryRows<PermissionTarget>(`
                SELECT ${projection} FROM Auto_Admin__resources r WHERE r.id = ? FOR UPDATE
            `, [change.targetId])
            : await this.executor.queryRows<PermissionTarget>(`
                SELECT ${projection}, f.state AS fieldState
                FROM Auto_Admin__fields f JOIN Auto_Admin__resources r ON r.id = f.resource_id
                WHERE f.id = ? FOR UPDATE
            `, [change.targetId]);
        return rows[0] ?? null;
    }

    async getPermissionForUpdate(change: PermissionChange): Promise<PermissionEffect | null> {
        const table = tables[change.subjectType][change.targetType];
        const rows = await this.executor.queryRows<{ effect: PermissionEffect }>(`
            SELECT effect FROM ${table}
            WHERE ${change.subjectType}_id = ? AND ${change.targetType}_id = ? AND action = ? FOR UPDATE
        `, [change.subjectId, change.targetId, change.action]);
        return rows[0]?.effect ?? null;
    }

    async setPermission(change: PermissionChange): Promise<void> {
        const table = tables[change.subjectType][change.targetType];
        const params = [change.subjectId, change.targetId, change.action];
        if (change.effect === null) {
            await this.executor.execute(`DELETE FROM ${table}
                WHERE ${change.subjectType}_id = ? AND ${change.targetType}_id = ? AND action = ?`, params);
        } else {
            await this.executor.execute(`INSERT INTO ${table}
                (${change.subjectType}_id, ${change.targetType}_id, action, effect) VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE effect = ?`, [...params, change.effect, change.effect]);
        }
    }

    async appendAudit(change: PermissionChange, previousEffect: PermissionEffect | null, actorUserId: number, requestId: string | null): Promise<void> {
        await this.executor.execute(`INSERT INTO Auto_Admin__permission_audit_events
            (actor_user_id, subject_type, subject_id, target_type, target_id, action, previous_effect, new_effect, request_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            actorUserId, change.subjectType, change.subjectId, change.targetType, change.targetId,
            change.action, previousEffect, change.effect, requestId,
        ]);
    }

    async listPermissions(subjectType: PermissionSubjectType, subjectId: number): Promise<StoredPermission[]> {
        return this.executor.queryRows<StoredPermission>(`
            SELECT 'resource' AS targetType, resource_id AS targetId, action, effect
            FROM ${tables[subjectType].resource} WHERE ${subjectType}_id = ?
            UNION ALL
            SELECT 'field', field_id, action, effect
            FROM ${tables[subjectType].field} WHERE ${subjectType}_id = ?
        `, [subjectId, subjectId]);
    }

}
