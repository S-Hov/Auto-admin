import { DbExecutor } from "../../db";
import { InstallationStatus } from "../../utils/db";
import { InstallationStatusValue } from "./install.types";
import { PoolConnection } from "mysql2/promise";

export const updateInstallationStatus = async (executor: DbExecutor, newStatus: InstallationStatusValue): Promise<void> => {
    await executor.query(`
        INSERT INTO Auto_Admin__installation (id, status) 
        VALUES (1, ?) 
        ON DUPLICATE KEY UPDATE status = VALUES(status)
    `, [newStatus]);
};

export const getInstallationStatusForUpdate = async (connection: PoolConnection)
: Promise<InstallationStatus | undefined> => {
    const [rows] = await connection.query<InstallationStatus[]>(`
        SELECT status
        FROM Auto_Admin__installation
        WHERE id = 1
        FOR UPDATE
    `);

    return rows[0];
};