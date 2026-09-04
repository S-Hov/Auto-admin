import type { RowDataPacket, ResultSetHeader, Connection } from "mysql2/promise";
import { MIGRATION_HISTORY_TABLE } from "./config";
import type { MigrationDescriptor, MigrationHistoryRecord, MigrationStatus } from "./migration.types";

interface MigrationHistoryRow extends RowDataPacket {
    version: string;
    name: string;
    file_name: string;
    checksum: string;
    status: MigrationStatus;
    started_at: Date;
    finished_at: Date | null;
    execution_ms: number | null;
    error_message: string | null;
    attempt_count: number;
    app_version: string | null;
    updated_at: Date;
}

export const ensureMigrationHistoryTable = async (connection: Connection): Promise<void> => {
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
    `);
}

export const getMigrationHistory = async (connection: Connection): Promise<ReadonlyArray<MigrationHistoryRecord>> => {
    const [rows] = await connection.query<MigrationHistoryRow[]>(`
        SELECT 
            version,
            name,
            file_name,
            checksum,
            status,
            started_at,
            finished_at,
            execution_ms,
            error_message,
            attempt_count,
            app_version,
            updated_at
        FROM \`${MIGRATION_HISTORY_TABLE}\` ORDER BY version ASC
    `);

    return rows.map((row) => ({
        version: row.version,
        name: row.name,
        fileName: row.file_name,
        checksum: row.checksum,
        status: row.status,
        startedAt: row.started_at,
        finishedAt: row.finished_at,
        executionMs: row.execution_ms,
        errorMessage: row.error_message,
        attemptCount: row.attempt_count,
        appVersion: row.app_version,
        updatedAt: row.updated_at,
    }));
}

export const insertRunningMigration = async (connection: Connection, descriptor: MigrationDescriptor, appVersion: string | null): Promise<void> => {
    await connection.query(`
            INSERT INTO \`${MIGRATION_HISTORY_TABLE}\` (
            version,
            name,
            file_name,
            checksum,
            status,
            app_version
        ) VALUES (
            ?, ?, ?, ?, 'running', ?
        )
    `, [
        descriptor.version,
        descriptor.name,
        descriptor.fileName,
        descriptor.checksum,
        appVersion,
    ]);
}

export const markMigrationApplied = async (connection: Connection, version: string, executionMs: number): Promise<void> => {
    const [result] = await connection.query<ResultSetHeader>(`
        UPDATE \`${MIGRATION_HISTORY_TABLE}\`
        SET status = 'applied',
            finished_at = CURRENT_TIMESTAMP(3),
            execution_ms = ?,
            error_message = NULL
        WHERE version = ?
        AND status = 'running'
    `, [executionMs, version]);
    if (result.affectedRows !== 1) {
        throw new Error(`Migration ${version} not found or not in running state`);
    }
}

export const markMigrationFailed = async (connection: Connection, version: string, executionMs: number, errorMessage: string): Promise<void> => {
    const [result] = await connection.query<ResultSetHeader>(`
        UPDATE \`${MIGRATION_HISTORY_TABLE}\`
        SET status = 'failed',
            finished_at = CURRENT_TIMESTAMP(3),
            execution_ms = ?,
            error_message = ?
        WHERE version = ?
        AND status = 'running'
    `, [executionMs, errorMessage.slice(0, 4000), version]);
    if (result.affectedRows !== 1) {
        throw new Error(`Migration ${version} not found or not in running state`);
    }
}

export const markMigrationAppliedFromRecovery = async (
    connection: Connection,
    version: string
): Promise<void> => {
    const [result] = await connection.query<ResultSetHeader>(`
        UPDATE \`${MIGRATION_HISTORY_TABLE}\`
        SET status = 'applied',
            finished_at = CURRENT_TIMESTAMP(3),
            execution_ms = 0,
            error_message = NULL
        WHERE version = ?
        AND status IN ('failed', 'running')
    `, [version]);

    if (result.affectedRows !== 1) {
        throw new Error(`Migration ${version} not found or not in recoverable state`);
    }
};

export const prepareMigrationForRetry = async (connection: Connection, version: string): Promise<void> => {
    await connection.query(`
        UPDATE \`${MIGRATION_HISTORY_TABLE}\`
        SET status = 'running',
            started_at = CURRENT_TIMESTAMP(3),
            finished_at = NULL,
            error_message = NULL,
            attempt_count = attempt_count + 1
        WHERE version = ?
        AND status IN ('failed', 'running')
    `, [version]);
};