import { DbConnectionData } from "./install.types";
import mysql from "mysql2/promise";

export const checkConnectionRepository = async (data: DbConnectionData): Promise<{ version?: string }> => {
    const { host, port, database, user, password } = data;

    let connection: mysql.Connection | null = null;

    try {
        connection = await mysql.createConnection({
            host,
            port,
            user,
            password,
            database,
        });

        const [rows] = await connection.query("SELECT VERSION() AS version");
        const version = (rows as any)[0]?.version;

        return { version };

    } catch (error) {
        console.error('Error in checkConnectionRepository:', error);
        throw error;
    } finally {
        await connection?.end();
    }
}