import mysql, { RowDataPacket } from "mysql2/promise";

export interface DbConnectionData {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}

interface VersionRow extends RowDataPacket {
    version: string;
}

export const checkConnection = async ({ host, port, database, user, password }: DbConnectionData): Promise<{ version?: string }> => {
    let connection: mysql.Connection | null = null;

    try {

        connection = await mysql.createConnection({
            host,
            port,
            user,
            password,
            database,
            connectTimeout: 5000,
        });

        const [rows] = await connection.query<VersionRow[]>("SELECT VERSION() AS version");
        const version = rows[0]?.version;

        return { version };

    } catch (error) {
        console.error('Error in checkConnection:', error);
        throw error;
    } finally {
        await connection?.end();
    }
}