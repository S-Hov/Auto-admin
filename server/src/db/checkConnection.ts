import mysql from "mysql2/promise";

export interface DbConnectionData {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
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
        });

        const [rows] = await connection.query("SELECT VERSION() AS version");
        const version = (rows as any)[0]?.version;

        return { version };

    } catch (error) {
        console.error('Error in checkConnection:', error);
        throw error;
    } finally {
        await connection?.end();
    }
}