import type { RowDataPacket } from "mysql2";
import type { DbExecutor } from "../../../db";
import type { DBTable } from "../types/schema-catalog.types";

export const upsertPresentResources = async (executor: DbExecutor, schemaName: string, snapshotTables: DBTable[], scanId: number) => {
    if (snapshotTables.length === 0) {
        return;
    }

    for (const snapshotTable of snapshotTables) {
        await executor.query(`
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'present') 
            ON DUPLICATE KEY UPDATE 
                object_type = VALUES(object_type),
                engine = COALESCE(VALUES(engine), engine), 
                comment = COALESCE(VALUES(comment), comment), 
                is_service = VALUES(is_service), 
                state = VALUES(state),
                last_seen_scan_id = VALUES(last_seen_scan_id)
        `, [[
                schemaName,
                snapshotTable.name,
                snapshotTable.type,
                snapshotTable.engine,
                snapshotTable.comment,
                snapshotTable.isServiceTable,
                scanId,
                scanId
            ]]
        );
    }
}

export const markResourcesMissing = async (executor: DbExecutor, resourceIds: number[]) => {
    if (resourceIds.length === 0) {
        return;
    }

    executor.query(`
        UPDATE Auto_Admin__resources 
        SET state = 'missing'
        WHERE id IN (?)
    `, [resourceIds.join(',')]);
}