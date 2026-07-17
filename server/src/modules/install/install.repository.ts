import { DbExecutor, getPool } from "../../db";
import { DbConnectionData, InstallationStatus } from "./install.types";
import mysql, { PoolConnection } from "mysql2/promise";

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

export const getInstallationStatus = async (): Promise<InstallationStatus> => {
    const [status] = await getPool().query<InstallationStatus[]>(`
        SELECT status FROM Auto_Admin__installation
    `);
    return status[0];
}

export const updateInstallationStatus = async (executor: DbExecutor, newStatus: string): Promise<void> => {
    await executor.query(`
        INSERT INTO Auto_Admin__installation (id, status) 
        VALUES (1, ?) 
        ON DUPLICATE KEY UPDATE status = VALUES(status)
    `, [newStatus]);
};