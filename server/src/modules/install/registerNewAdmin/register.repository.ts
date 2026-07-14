import { getPool } from "../../../db";
import { RequestMeta, UserRole } from "./register.types";

export const getRoleByKey = async (key: string): Promise<UserRole> => {
    const [role] = await getPool().query<UserRole[]>(`
        SELECT id, \`key\`, name, rights FROM Auto_Admin__roles
        WHERE \`key\` = ?
    `, [key])

    return role[0];
}

export const register = async (roleId: number, name: string, passwordHash: string): Promise<void> => {
    await getPool().query(`
        INSERT INTO Auto_Admin__users
        (role_id, username, password_hash)
        VALUES (?, ?, ?)
    `, [roleId, name, passwordHash]);
}

export const registerLogger = async (meta: RequestMeta) => {
    await getPool().query(`
        INSERT INTO Auto_Admin__auth_logs
        (event_type, ip_address, user_agent)
        VALUES (register_success, ?, ?)
    `, [meta.ipAddress, meta.userAgent]);
}