import { type PoolConnection } from "mysql2/promise";
import { MIGRATION_HISTORY_TABLE } from "./config";

export const ensureMigrationHistoryTable = async (connection: PoolConnection): Promise<void> => {
    await connection.query(`
        CREATE TABLE IF NOT EXISTS \`${MIGRATION_HISTORY_TABLE}\` (
            version VARCHAR(32) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            file_name VARCHAR(255) UNIQUE NOT NULL,
            checksum CHAR(64) NOT NULL,
            status ENUM('running', 'applied', 'failed') NOT NULL,
            started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            finished_at DATETIME(3) NULL,
            execution_ms BIGINT UNSIGNED NULL,
            error_message TEXT NULL,
            attempt_count INT UNSIGNED NOT NULL DEFAULT 1,
            app_version VARCHAR(64) NULL,
            updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)
}