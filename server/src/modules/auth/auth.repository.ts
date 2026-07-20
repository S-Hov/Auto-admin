import { getPool } from "../../db"
import { User } from "./auth.types";

export const getUserByUserName = async (userName: String): Promise<User | undefined> => {
    const [user] = await getPool().query<User[]>(`
        SELECT id, role_id, username, password_hash, is_active FROM Auto_Admin__users
        WHERE username = ?
    `, [userName])

    return user[0];
}