import type { DatabaseExecutor } from "../../../db/contracts/executor.interface";
import { MIGRATION_HISTORY_TABLE } from "../../config";
import type { MigrationHistoryRepository } from "../../contracts/migrations.interface";
import type {
    RecoveryAction,
    RecoveryAuditMeta,
    RecoveryResult,
} from "../../contracts/migrations.types";
import type { MigrationDescriptor, MigrationHistoryRecord, MigrationStatus } from "../../migration.types";

interface MigrationHistoryRow {
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

export class MySqlMigrationHistoryRepository implements MigrationHistoryRepository {
    constructor(private readonly executor: DatabaseExecutor) {}

    async ensureMigrationHistoryTable(): Promise<void> {
        await this.executor.execute(`
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `, undefined, { timeoutMs: null });
    }

    async getMigrationHistory(): Promise<ReadonlyArray<MigrationHistoryRecord>> {
        const rows = await this.executor.queryRows<MigrationHistoryRow>(`
            SELECT version, name, file_name, checksum, status, started_at,
                finished_at, execution_ms, error_message, attempt_count,
                app_version, updated_at
            FROM \`${MIGRATION_HISTORY_TABLE}\`
            ORDER BY version ASC
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

    async insertRunningMigration(descriptor: MigrationDescriptor, appVersion: string | null): Promise<void> {
        await this.executor.execute(`
            INSERT INTO \`${MIGRATION_HISTORY_TABLE}\`
                (version, name, file_name, checksum, status, app_version)
            VALUES (?, ?, ?, ?, 'running', ?)
        `, [descriptor.version, descriptor.name, descriptor.fileName, descriptor.checksum, appVersion]);
    }

    async markMigrationApplied(version: string, executionMs: number): Promise<void> {
        const result = await this.executor.execute(`
            UPDATE \`${MIGRATION_HISTORY_TABLE}\`
            SET status = 'applied', finished_at = CURRENT_TIMESTAMP(3),
                execution_ms = ?, error_message = NULL
            WHERE version = ? AND status = 'running'
        `, [executionMs, version]);
        if (result.affectedRows !== 1) {
            throw new Error(`Migration ${version} not found or not in running state`);
        }
    }

    async markMigrationFailed(version: string, executionMs: number, errorMessage: string): Promise<void> {
        const result = await this.executor.execute(`
            UPDATE \`${MIGRATION_HISTORY_TABLE}\`
            SET status = 'failed', finished_at = CURRENT_TIMESTAMP(3),
                execution_ms = ?, error_message = ?
            WHERE version = ? AND status = 'running'
        `, [executionMs, errorMessage.slice(0, 4000), version]);
        if (result.affectedRows !== 1) {
            throw new Error(`Migration ${version} not found or not in running state`);
        }
    }

    async markMigrationAppliedFromRecovery(version: string): Promise<void> {
        const result = await this.executor.execute(`
            UPDATE \`${MIGRATION_HISTORY_TABLE}\`
            SET status = 'applied', finished_at = CURRENT_TIMESTAMP(3),
                execution_ms = 0, error_message = NULL
            WHERE version = ? AND status IN ('failed', 'running')
        `, [version]);
        if (result.affectedRows !== 1) {
            throw new Error(`Migration ${version} not found or not in recoverable state`);
        }
    }

    async prepareMigrationForRetry(version: string): Promise<void> {
        const result = await this.executor.execute(`
            UPDATE \`${MIGRATION_HISTORY_TABLE}\`
            SET status = 'running', started_at = CURRENT_TIMESTAMP(3),
                finished_at = NULL, error_message = NULL,
                attempt_count = attempt_count + 1
            WHERE version = ? AND status IN ('failed', 'running')
        `, [version]);
        if (result.affectedRows !== 1) {
            throw new Error(`Migration ${version} not found or not in recoverable state`);
        }
    }

    async ensureMigrationRecoveryAuditTable(): Promise<void> {
        await this.executor.execute(
            `
                CREATE TABLE IF NOT EXISTS Auto_Admin__migration_recovery_events (
                    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    migration_version VARCHAR(32) NOT NULL,
                    action ENUM('retry', 'mark_applied') NOT NULL,
                    result ENUM('started', 'succeeded', 'failed') NOT NULL,
                    ip_address VARCHAR(45) NULL,
                    user_agent TEXT NULL,
                    request_id VARCHAR(64) NULL,
                    error_summary VARCHAR(512) NULL,
                    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                    finished_at DATETIME(3) NULL,
                    INDEX idx_recovery_migration_created (migration_version, created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `,
            undefined,
            { timeoutMs: null },
        );
    }

    async startMigrationRecoveryEvent(
        version: string,
        action: RecoveryAction,
        meta: RecoveryAuditMeta,
    ): Promise<number> {
        const result = await this.executor.execute(
            `
                INSERT INTO Auto_Admin__migration_recovery_events (
                    migration_version, action, result, ip_address, user_agent, request_id
                ) VALUES (?, ?, 'started', ?, ?, ?)
            `,
            [version, action, meta.ipAddress, meta.userAgent, meta.requestId],
        );

        if (typeof result.insertId !== "number" || result.insertId <= 0) {
            throw new Error("Database did not return a recovery event id");
        }

        return result.insertId;
    }

    async finishMigrationRecoveryEvent(
        eventId: number,
        result: Exclude<RecoveryResult, "started">,
        errorSummary: string | null = null,
    ): Promise<void> {
        const update = await this.executor.execute(
            `
                UPDATE Auto_Admin__migration_recovery_events
                SET result = ?, error_summary = ?, finished_at = CURRENT_TIMESTAMP(3)
                WHERE id = ? AND result = 'started'
            `,
            [result, errorSummary?.slice(0, 512) ?? null, eventId],
        );

        if (update.affectedRows !== 1) {
            throw new Error(
                `Recovery event ${eventId} not found or already completed`,
            );
        }
    }
}
