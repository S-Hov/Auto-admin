import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { DbExecutor } from "../../db";
import type { SchemaScanChangeCounts, StoredField, StoredResource } from "./schema-catalog.types";
import type { AutoAdmin } from "../../db/db.types";

type StoredResourceRow =
    RowDataPacket
    & Pick<
        AutoAdmin.Resource,
        | 'id'
        | 'schema_name'
        | 'table_name'
        | 'object_type'
        | 'engine'
        | 'comment'
        | 'is_service'
        | 'state'
        | 'first_seen_scan_id'
        | 'last_seen_scan_id'
    >;

type StoredFieldRow =
    RowDataPacket
    & Pick<
        AutoAdmin.Field,
        | 'id'
        | 'resource_id'
        | 'column_name'
        | 'ordinal_position'
        | 'data_type'
        | 'column_type'
        | 'is_nullable'
        | 'default_value'
        | 'character_maximum_length'
        | 'numeric_precision'
        | 'numeric_scale'
        | 'datetime_precision'
        | 'character_set_name'
        | 'collation_name'
        | 'is_auto_increment'
        | 'is_generated'
        | 'generation_expression'
        | 'extra'
        | 'comment'
        | 'state'
        | 'first_seen_scan_id'
        | 'last_seen_scan_id'
    >;

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
            finished_at = NOW(3),
            error_code = ?
        WHERE id = ?
            AND status = 'running'
    `, [errorCode, scanId]);

    if (result.affectedRows !== 1) {
        throw new Error(`Schema scan ${scanId} not found or not in 'running' state`);
    }
}

export const readStoredResources = async (executor: DbExecutor, schemaName: string): Promise<StoredResource[]> => {
    const [result] = await executor.query<StoredResourceRow[]>(`
        SELECT
            id,
            schema_name,
            table_name,
            object_type,
            engine,
            comment,
            is_service,
            state,
            first_seen_scan_id,
            last_seen_scan_id
        FROM Auto_Admin__resources
        WHERE schema_name = ?
        ORDER BY table_name
    `, [schemaName]);

    return result.map((resource) => ({
        id: resource.id,
        schemaName: resource.schema_name,
        tableName: resource.table_name,
        type: resource.object_type,
        engine: resource.engine,
        comment: resource.comment,
        isServiceTable: Boolean(resource.is_service),
        state: resource.state,
        firstSeenScanId: resource.first_seen_scan_id,
        lastSeenScanId: resource.last_seen_scan_id,
    }));
}
export const readStoredFields = async (executor: DbExecutor, schemaName: string): Promise<StoredField[]> => {
    const [result] = await executor.query<StoredFieldRow[]>(`
        SELECT
            f.id,
            f.resource_id,
            f.column_name,
            f.ordinal_position,
            f.data_type,
            f.column_type,
            f.is_nullable,
            f.default_value,
            f.character_maximum_length,
            f.numeric_precision,
            f.numeric_scale,
            f.datetime_precision,
            f.character_set_name,
            f.collation_name,
            f.is_auto_increment,
            f.is_generated,
            f.generation_expression,
            f.extra,
            f.comment,
            f.state,
            f.first_seen_scan_id,
            f.last_seen_scan_id
        FROM Auto_Admin__fields AS f
        INNER JOIN Auto_Admin__resources AS r
            ON r.id = f.resource_id
        WHERE r.schema_name = ?
        ORDER BY r.table_name, f.ordinal_position
    `, [schemaName]);

    return result.map((field) => ({
        id: field.id,
        resourceId: field.resource_id,
        name: field.column_name,
        position: field.ordinal_position,
        dataType: field.data_type,
        columnType: field.column_type,
        nullable: Boolean(field.is_nullable),
        defaultValue: field.default_value,
        characterMaximumLength: field.character_maximum_length,
        numericPrecision: field.numeric_precision,
        numericScale: field.numeric_scale,
        datetimePrecision: field.datetime_precision,
        characterSetName: field.character_set_name,
        collationName: field.collation_name,
        autoIncrement: Boolean(field.is_auto_increment),
        generated: {
            isGenerated: Boolean(field.is_generated),
            generationExpression: field.generation_expression,
        },
        extra: field.extra,
        comment: field.comment,
        state: field.state,
        firstSeenScanId: field.first_seen_scan_id,
        lastSeenScanId: field.last_seen_scan_id,
    }));
};
