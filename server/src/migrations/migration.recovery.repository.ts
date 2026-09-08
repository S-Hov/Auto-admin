import type { Connection, ResultSetHeader } from 'mysql2/promise';

export type RecoveryAction = 'retry' | 'mark_applied';
export type RecoveryResult = 'started' | 'succeeded' | 'failed';

export interface RecoveryAuditMeta {
    ipAddress: string | null;
    userAgent: string | null;
    requestId: string | null;
}

export const ensureMigrationRecoveryAuditTable = async (connection: Connection): Promise<void> => {
    await connection.query(`
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
    `);
};

export const startMigrationRecoveryEvent = async (
    connection: Connection,
    version: string,
    action: RecoveryAction,
    meta: RecoveryAuditMeta,
): Promise<number> => {
    const [result] = await connection.query<ResultSetHeader>(`
        INSERT INTO Auto_Admin__migration_recovery_events (
            migration_version, action, result, ip_address, user_agent, request_id
        ) VALUES (?, ?, 'started', ?, ?, ?)
    `, [version, action, meta.ipAddress, meta.userAgent, meta.requestId]);

    return result.insertId;
};

export const finishMigrationRecoveryEvent = async (
    connection: Connection,
    eventId: number,
    result: Exclude<RecoveryResult, 'started'>,
    errorSummary: string | null = null,
): Promise<void> => {
    const [update] = await connection.query<ResultSetHeader>(`
        UPDATE Auto_Admin__migration_recovery_events
        SET result = ?, error_summary = ?, finished_at = CURRENT_TIMESTAMP(3)
        WHERE id = ? AND result = 'started'
    `, [result, errorSummary?.slice(0, 512) ?? null, eventId]);

    if (update.affectedRows !== 1) {
        throw new Error(`Recovery event ${eventId} not found or already completed`);
    }
};
