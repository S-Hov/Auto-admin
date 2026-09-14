import type { DbExecutor } from "../../../db";
import type { StoredField, StoredResource } from "../types/schema-catalog.types";
import type { StoredFieldRow, StoredResourceRow } from "./repository.types";

export const readStoredResources = async (
    executor: DbExecutor,
    schemaName: string,
): Promise<StoredResource[]> => {
    const [rows] = await executor.query<StoredResourceRow[]>(`
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

    return rows.map((resource) => ({
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
};

export const readStoredFields = async (
    executor: DbExecutor,
    schemaName: string,
): Promise<StoredField[]> => {
    const [rows] = await executor.query<StoredFieldRow[]>(`
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

    return rows.map((field) => ({
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
