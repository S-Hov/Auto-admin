import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { DbExecutor } from "../../../db";
import type { SchemaScanChangeCounts } from "../types/schema-catalog.types";

interface SuccessfulScanRow extends RowDataPacket {
    snapshot_fingerprint: string;
}

export const readLatestSuccessfulScanFingerprint = async (
    executor: DbExecutor,
    schemaName: string,
): Promise<string | null> => {
    const [rows] = await executor.query<SuccessfulScanRow[]>(`
        SELECT snapshot_fingerprint
        FROM Auto_Admin__schema_scans
        WHERE schema_name = ?
            AND status = 'succeeded'
            AND snapshot_fingerprint IS NOT NULL
        ORDER BY id DESC
        LIMIT 1
    `, [schemaName]);

    return rows[0]?.snapshot_fingerprint ?? null;
};

export const createRunningSchemaScan = async (
    executor: DbExecutor,
    schemaName: string,
    createdBy: number | null,
): Promise<number> => {
    const [result] = await executor.query<ResultSetHeader>(`
        INSERT INTO Auto_Admin__schema_scans
        (status, schema_name, created_by)
        VALUES (?, ?, ?)
    `, ['running', schemaName, createdBy]);

    if (!result.insertId || result.insertId < 0) {
        throw new Error('Failed to insert schema scan');
    }

    return result.insertId;
};

export const markSchemaScanSucceeded = async (
    executor: DbExecutor,
    scanId: number,
    fingerprint: string,
    counts: SchemaScanChangeCounts,
): Promise<void> => {
    const [result] = await executor.query<ResultSetHeader>(`
        UPDATE Auto_Admin__schema_scans
        SET
            status = 'succeeded',
            finished_at = NOW(3),
            snapshot_fingerprint = ?,
            added_resources = ?,
            changed_resources = ?,
            missing_resources = ?,
            added_fields = ?,
            changed_fields = ?,
            missing_fields = ?,
            error_code = NULL
        WHERE id = ?
            AND status = 'running'
    `, [
        fingerprint,
        counts.addedResources,
        counts.changedResources,
        counts.missingResources,
        counts.addedFields,
        counts.changedFields,
        counts.missingFields,
        scanId,
    ]);

    if (result.affectedRows !== 1) {
        throw new Error(`Schema scan ${scanId} not found or not in 'running' state`);
    }
};

export const markSchemaScanFailed = async (
    executor: DbExecutor,
    scanId: number,
    errorCode: string,
): Promise<void> => {
    const [result] = await executor.query<ResultSetHeader>(`
        UPDATE Auto_Admin__schema_scans
        SET
            status = 'failed',
            finished_at = NOW(3),
            error_code = ?
        WHERE id = ?
            AND status = 'running'
    `, [errorCode, scanId]);

    if (result.affectedRows !== 1) {
        throw new Error(`Schema scan ${scanId} not found or not in 'running' state`);
    }
};
