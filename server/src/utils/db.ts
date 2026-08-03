import { getPool } from "../db";
import { AutoAdmin } from "../db/db.types";
import mysql, { RowDataPacket } from "mysql2/promise";

export type InstallationStatus = RowDataPacket &
    Pick<AutoAdmin.Installation, 'status'>

export type CheckDbConnectionData = AutoAdmin.DbConnectionData & {
    useEnv?: boolean;
};

export const hasCompleteConfig = (): boolean => {
    if (
        process.env.Auto_Admin__DB_HOST &&
        process.env.Auto_Admin__DB_PORT &&
        process.env.Auto_Admin__DB_USERNAME &&
        (process.env.Auto_Admin__DB_PASSWORD || process.env.Auto_Admin__DB_PASSWORD === '') &&
        process.env.Auto_Admin__DB_DATABASE
    ) {
        return true;
    }

    return false;
}

export const checkConnection = async({host, port, database, user, password }: CheckDbConnectionData): Promise<{ version?: string }> => {
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

export const getInstallationStatus = async (): Promise<InstallationStatus | undefined> => {
    const [status] = await getPool().query<InstallationStatus[]>(`
        SELECT status FROM Auto_Admin__installation
    `);
    return status[0];
}