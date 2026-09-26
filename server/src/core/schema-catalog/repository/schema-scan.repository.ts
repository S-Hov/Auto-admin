import type { SchemaScanChangeCounts } from "../types/schema-catalog.types";
import type { DatabaseExecutor } from "../../../db/contracts/executor.interface";

interface SuccessfulScanRow {
    snapshot_fingerprint: string;
}

export const readLatestSuccessfulScanFingerprint = async (
    executor: DatabaseExecutor,
    schemaName: string,
): Promise<string | null> => {
    const rows = await executor.queryRows<SuccessfulScanRow>(
        `
            SELECT snapshot_fingerprint
            FROM Auto_Admin__schema_scans
            WHERE schema_name = ?
                AND status = 'succeeded'
                AND snapshot_fingerprint IS NOT NULL
            ORDER BY id DESC
            LIMIT 1
        `,
        [schemaName],
    );

    return rows[0]?.snapshot_fingerprint ?? null;
};

export const createRunningSchemaScan = async (
    executor: DatabaseExecutor,
    schemaName: string,
    createdBy: number | null,
): Promise<number> => {
    const result = await executor.execute(
        `
            INSERT INTO Auto_Admin__schema_scans
            (status, schema_name, created_by)
            VALUES (?, ?, ?)
        `,
        ["running", schemaName, createdBy],
    );

    if (
        !result.insertId ||
        typeof result.insertId !== "number" ||
        result.insertId < 0
    ) {
        throw new Error("Failed to insert schema scan");
    }

    return result.insertId;
};

export const markSchemaScanSucceeded = async (
    executor: DatabaseExecutor,
    scanId: number,
    fingerprint: string,
    counts: SchemaScanChangeCounts,
): Promise<void> => {
    const result = await executor.execute(
        `
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
        `,
        [
            fingerprint,
            counts.addedResources,
            counts.changedResources,
            counts.missingResources,
            counts.addedFields,
            counts.changedFields,
            counts.missingFields,
            scanId,
        ],
    );

    if (result.affectedRows !== 1) {
        throw new Error(
            `Schema scan ${scanId} not found or not in 'running' state`,
        );
    }
};

export const markSchemaScanFailed = async (
    executor: DatabaseExecutor,
    scanId: number,
    errorCode: string,
): Promise<void> => {
    const result = await executor.execute(
        `
            UPDATE Auto_Admin__schema_scans
            SET
                status = 'failed',
                finished_at = NOW(3),
                error_code = ?
            WHERE id = ?
                AND status = 'running'
        `,
        [errorCode, scanId],
    );

    if (result.affectedRows !== 1) {
        throw new Error(
            `Schema scan ${scanId} not found or not in 'running' state`,
        );
    }
};
