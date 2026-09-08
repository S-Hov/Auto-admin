import { DbExecutor, getPool } from "../../db";
import { InstallationStatus, InstallationStatusValue } from "./install.types";
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

export const getInstallationStatus = async (): Promise<InstallationStatusValue | undefined> => {
    const [rows] = await getPool().query<InstallationStatus[]>(`
        SELECT status
        FROM Auto_Admin__installation
        WHERE id = 1
        LIMIT 1
    `);
    return rows[0]?.status;
}

export const markMigrationsCompleted = async (executor: DbExecutor): Promise<void> => {
    await executor.query(`
        INSERT INTO Auto_Admin__installation (id, status)
        VALUES (1, 'migrated')
        ON DUPLICATE KEY UPDATE
            status = CASE
                WHEN Auto_Admin__installation.status = 'ready' THEN 'ready'
                ELSE 'migrated'
            END
    `);
};
