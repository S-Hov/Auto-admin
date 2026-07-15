import { getPool } from "../../db"

export const getUserByUserName = async (userName: String) => {
    const [rows] = await getPool().query(`
        SELECT * FROM Auto_Admin__users
        WHERE username = ?
    `, [userName])

    return rows;
}