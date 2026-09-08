import mysql, { RowDataPacket } from "mysql2/promise";
import { envConfig } from "../config/env";
import { logger } from "../shared/logger";

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
            connectTimeout: envConfig.Auto_Admin__DB_CONNECT_TIMEOUT_MS,
        });

        const [rows] = await connection.query<VersionRow[]>("SELECT VERSION() AS version");
        const version = rows[0]?.version;

        return { version };

    } catch (error) {
        const safeError = error instanceof Error
            ? { name: error.name, message: error.message, code: 'code' in error ? String(error.code) : undefined }
            : { type: typeof error };
        logger.warn({ error: safeError, service: 'database-connection-check' }, 'Database connection check failed');
        throw error;
    } finally {
        await connection?.end();
    }
}
