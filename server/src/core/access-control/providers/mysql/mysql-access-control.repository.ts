import type { DatabaseExecutor } from "../../../../db/contracts/executor.interface";
import type {
    PermissionRuleSubject,
    PermissionRuleSet,
} from "../../contracts/access-control-repository.types";
import type { AccessControlRepository } from "../../contracts/access-control-repository.interface";
import type {
    MySqlFieldPermissionRow,
    MySqlResourcePermissionRow,
} from "./mysql-access-control-row.types";

export class MySqlAccessControlRepository implements AccessControlRepository {
    constructor(private readonly executor: DatabaseExecutor) {}

    async getPermissionsForUser(
        subject: PermissionRuleSubject,
    ): Promise<PermissionRuleSet> {
        const { userId, roleId } = subject;

        const [roleResourceRules, userResourceRules, roleFieldRules, userFieldRules] =
            await Promise.all([
                this.getRoleResourceRules(roleId),
                this.getUserResourceRules(userId),
                this.getRoleFieldRules(roleId),
                this.getUserFieldRules(userId),
            ])

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
                action: row.action,
                effect: row.effect,
            })),
            userFieldRules: userFieldRules.map((row) => ({
                fieldId: row.field_id,
                action: row.action,
                effect: row.effect,
            })),
        };
    }

    async getRoleResourceRules(
        roleId: number,
    ): Promise<MySqlResourcePermissionRow[]> {
        return await this.executor.queryRows<MySqlResourcePermissionRow>(
            `
            SELECT
                resource_id,
                action,
                effect
            FROM Auto_Admin__role_resource_permissions
            WHERE
                role_id = ?
        `,
            [roleId],
        );
    }

    async getUserResourceRules(
        userId: number,
    ): Promise<MySqlResourcePermissionRow[]> {
        return this.executor.queryRows<MySqlResourcePermissionRow>(
            `
            SELECT
                resource_id,
                action,
                effect
            FROM Auto_Admin__user_resource_permissions
            WHERE
                user_id = ?
        `,
            [userId],
        );
    }

    async getRoleFieldRules(
        roleId: number,
    ): Promise<MySqlFieldPermissionRow[]> {
        return await this.executor.queryRows<MySqlFieldPermissionRow>(
            `
                SELECT
                    field_id,
                    action,
                    effect
                FROM Auto_Admin__role_field_permissions
                WHERE
                    role_id = ?
            `,
            [roleId],
        );
    }

    async getUserFieldRules(
        userId: number,
    ): Promise<MySqlFieldPermissionRow[]> {
        return await this.executor.queryRows<MySqlFieldPermissionRow>(
            `
            SELECT
                field_id,
                action,
                effect
            FROM Auto_Admin__user_field_permissions
            WHERE
                user_id = ?
        `,
            [userId],
        );
    }
}
