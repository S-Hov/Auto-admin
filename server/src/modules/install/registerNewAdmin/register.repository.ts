import { ResultSetHeader } from "mysql2";
import { PoolConnection } from "mysql2/promise";
import { DbExecutor, getPool } from "../../../db";
import type { AdminLookupRow, RequestMeta, UserRole } from "./register.types";

export const getRoleByKey = async (key: string): Promise<UserRole> => {
    const [role] = await getPool().query<UserRole[]>(`
        SELECT id, \`key\`, name, rights FROM Auto_Admin__roles
        WHERE \`key\` = ?
    `, [key])

    return role[0];
}

export const register = async (connection: PoolConnection, roleId: number, name: string, passwordHash: string): Promise<number> => {
    const [result] = await connection.query<ResultSetHeader>(`
        INSERT INTO Auto_Admin__users
        (role_id, username, password_hash)
        VALUES (?, ?, ?)
    `, [roleId, name, passwordHash]);

    return result.insertId;
}

export const registerLogger = async (connection: PoolConnection, meta: RequestMeta, userId: number) => {
    await connection.query(`
        INSERT INTO Auto_Admin__auth_logs
        (user_id, event_type, ip_address, user_agent)
        VALUES (?, ?, ?, ?)
    `, [userId, 'register_success', meta.ipAddress, meta.userAgent]);
}

export const getAdminByRoleId = async (executor: DbExecutor, roleId: number): Promise<AdminLookupRow | undefined> => {
    const [users] = await executor.query<AdminLookupRow[]>(`
        SELECT id, username FROM Auto_Admin__users
        WHERE role_id = ?
        LIMIT 1
    `, [roleId]);

    return users[0];
}