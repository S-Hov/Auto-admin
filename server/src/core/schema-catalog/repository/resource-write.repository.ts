import type { ResultSetHeader } from "mysql2";
import type { DbExecutor } from "../../../db";
import type { DBTable } from "../types/schema-catalog.types";

export const upsertPresentResources = async (executor: DbExecutor, schemaName: string, snapshotTables: DBTable[], scanId: number): Promise<void> => {
    if (snapshotTables.length === 0) {
        return;
    }

    const params: unknown[][] = [];
    let paramsString: string = ``;

    for (const snapshotTable of snapshotTables) {
        params.push([
            schemaName,
            snapshotTable.name,
            snapshotTable.type,
            snapshotTable.engine,
            snapshotTable.comment,
            snapshotTable.isServiceTable,
            scanId,
            scanId
        ]);
        paramsString += `, (?, ?, ?, ?, ?, ?, ?, ?, 'present')`;
    }

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
        ) VALUES ${paramsString}
        ON DUPLICATE KEY UPDATE
            object_type = VALUES(object_type),
            engine = VALUES(engine),
            comment = VALUES(comment),
            is_service = VALUES(is_service),
            state = VALUES(state),
            last_seen_scan_id = VALUES(last_seen_scan_id)
    `, params);
}

export const markResourcesMissing = async (executor: DbExecutor, resourceIds: number[]): Promise<void> => {
    if (resourceIds.length === 0) {
        return;
    }

    let paramsString = `?`;

    for (let i = 1; i < resourceIds.length; i++) {
        paramsString += `, ?`;
    }

    const [result] = await executor.query<ResultSetHeader>(`
        UPDATE Auto_Admin__resources 
        SET state = 'missing'
        WHERE id IN (${paramsString})
            AND state = 'present'
    `, resourceIds);

    if (result.affectedRows !== resourceIds.length) {
        throw new Error(`Expected ${resourceIds.length} rows to be affected, but got ${result.affectedRows}.`)
    }
}