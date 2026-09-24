import { DatabaseExecutor } from "../../../../../db/contracts/executor.interface";
import { AdminLookupRow, RequestMeta, UserRole } from "../../register.types";
import { RegisterAdminRepository } from "../repository.interface";

export class MySqlRegisterAdminRepository implements RegisterAdminRepository {
    constructor(private readonly executor: DatabaseExecutor) {}

    async getRoleByKey(key: string): Promise<UserRole> {
        const [rows] = await this.executor.queryRows<UserRole[]>(
            `
                SELECT id, \`key\`, name, rights FROM Auto_Admin__roles
                WHERE \`key\` = ?
            `,
            [key],
        );

        return rows[0];
    }

    async register(
        roleId: number,
        name: string,
        passwordHash: string,
    ): Promise<number> {
        const result = await this.executor.execute(
            `
                INSERT INTO Auto_Admin__users
                (role_id, username, password_hash)
                VALUES (?, ?, ?)
            `,
            [roleId, name, passwordHash],
        );

        if (typeof result.insertId !== "number") {
            throw new Error("Failed to get insert ID");
        }

        return result.insertId;
    }

    async registerLogger(meta: RequestMeta, userId: number): Promise<void> {
        await this.executor.execute(
            `
                INSERT INTO Auto_Admin__auth_logs
                (user_id, event_type, ip_address, user_agent)
                VALUES (?, ?, ?, ?)
            `,
            [userId, "register_success", meta.ipAddress, meta.userAgent],
        );
    }

    async getAdminByRoleId(
        roleId: number,
    ): Promise<AdminLookupRow | undefined> {
        const [rows] = await this.executor.queryRows<AdminLookupRow[]>(
            `
                SELECT id, username FROM Auto_Admin__users
                WHERE role_id = ?
                LIMIT 1
            `,
            [roleId],
        );

        return rows[0];
    }
}
