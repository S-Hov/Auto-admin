import type { ResultSetHeader } from "mysql2";
import type { DbExecutor } from "../../db";
import type { SchemaScanChangeCounts } from "./schema-catalog.types";

export const createRunningSchemaScan = async (executor: DbExecutor, schemaName: string, createdBy: number | null): Promise<number> => {
    const [result] = await executor.query<ResultSetHeader>(`
        INSERT INTO Auto_Admin__schema_scans
        (status, schema_name, created_by)
        VALUES (?, ?, ?)
    `, ['running', schemaName, createdBy]);

    return result.insertId;
}

export const markSchemaScanSucceeded = async (executor: DbExecutor, scanId: number, fingerprint: string, counts: SchemaScanChangeCounts): Promise<void> => {
    const [result] = await executor.query<ResultSetHeader>(`
        UPDATE Auto_Admin__schema_scans
        SET
            status = 'succeeded',
            finished_at = NOW(),
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
        scanId
    ]);

    if (result.affectedRows !== 1) {
        throw new Error(`Schema scan ${scanId} not found or not in 'running' state`);
    }
}

export const markSchemaScanFailed = async (executor: DbExecutor, scanId: number, errorCode: string): Promise<void> => {
    const [result] = await executor.query<ResultSetHeader>(`
        UPDATE Auto_Admin__schema_scans
        SET
            status = 'failed',
            finished_at = NOW(),
            error_code = ?
        WHERE id = ?
            AND status = 'running'
    `, [errorCode, scanId]);

    if (result.affectedRows !== 1) {
        throw new Error(`Schema scan ${scanId} not found or not in 'running' state`);
    }
}
