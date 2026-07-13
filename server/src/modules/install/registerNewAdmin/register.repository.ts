import { getPool } from "../../../db";
import { UserRole } from "./register.types";

export const getRoleByKey = async (key: string): Promise<UserRole> => {
    const [role] = await getPool().query<UserRole[]>(`
        SELECT id, key, name, rights FROM Auto_Admin__roles
        WHERE key = ?
    `, [key])

    return role[0];
}

export const register = async (roleId: number, name: string, passwordHash: string) => {
    await getPool().query(`
        INSERT INTO Auto_Admin__users
        (role_id, username, password_hash)
        VALUES (?, ?, ?)
    `, [roleId, name, passwordHash])
}