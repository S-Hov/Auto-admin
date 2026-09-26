import type { DatabaseExecutor } from "../../../db/contracts/executor.interface";
import type { DBTable } from "../types/schema-catalog.types";

export const upsertPresentResources = async (
    executor: DatabaseExecutor,
    schemaName: string,
    snapshotTables: DBTable[],
    scanId: number,
): Promise<void> => {
    if (snapshotTables.length === 0) {
        return;
    }

    const placeholders = snapshotTables
        .map(() => `(?, ?, ?, ?, ?, ?, ?, ?, 'present')`)
        .join(", ");

    const params = snapshotTables.flatMap((table) => [
        schemaName,
        table.name,
        table.type,
        table.engine,
        table.comment,
        table.isServiceTable,
        scanId,
        scanId,
    ]);

    await executor.execute(
        `
            INSERT INTO Auto_Admin__resources (
                schema_name,
                table_name,
                object_type,
                engine,
                comment,
                is_service,
                first_seen_scan_id,
                last_seen_scan_id,
                state
            ) VALUES ${placeholders}
            ON DUPLICATE KEY UPDATE
                object_type = VALUES(object_type),
                engine = VALUES(engine),
                comment = VALUES(comment),
                is_service = VALUES(is_service),
                state = VALUES(state),
                last_seen_scan_id = VALUES(last_seen_scan_id)
        `,
        params,
    );
};

export const markResourcesMissing = async (
    executor: DatabaseExecutor,
    resourceIds: number[],
): Promise<void> => {
    if (resourceIds.length === 0) {
        return;
    }

    const placeholders = resourceIds.map(() => "?").join(", ");

    const result = await executor.execute(
        `
            UPDATE Auto_Admin__resources
            SET state = 'missing'
            WHERE id IN (${placeholders})
                AND state = 'present'
        `,
        resourceIds,
    );

    if (result.affectedRows !== resourceIds.length) {
        throw new Error(
            `Expected ${resourceIds.length} rows to be affected, but got ${result.affectedRows}.`,
        );
    }
};
