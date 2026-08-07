import { PoolConnection } from "mysql2/promise";
import { AUTO_ADMIN__MIGRATIONS_TABLE } from "./config";

export const ensureMigrationHistoryTable = async (connection: PoolConnection): Promise<void> => {
    await connection.query(`
        CREATE TABLE IF NOT EXISTS \`${AUTO_ADMIN__MIGRATIONS_TABLE}\` (
            version VARCHAR(30) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            file_name VARCHAR(255) UNIQUE NOT NULL,
            checksum CHAR(64) NOT NULL,
            status ENUM('running', 'applied', 'failed') NOT NULL,
            started_at DATETIME(3) NOT NULL,
            finished_at DATETIME(3) NULL,
            execution_ms BIGINT UNSIGNED NULL,
            error_message TEXT NULL,
            attempt_count TINYINT UNSIGNED NOT NULL DEFAULT 1,
            app_version VARCHAR(64) NULL,
            updated_at DATETIME(3) NOT NULL DEFAULT NOW() ON UPDATE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)
}