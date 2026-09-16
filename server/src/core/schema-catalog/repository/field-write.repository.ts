import type { ResultSetHeader } from "mysql2";
import type { DbExecutor } from "../../../db";
import type { FieldWriteItem } from "./repository.types";

export const upsertPresentFields = async (executor: DbExecutor, items: FieldWriteItem[], scanId: number): Promise<void> => {
    if (items.length === 0) {
        return;
    }

    const placeholders = items
        .map(() => `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'present')`)
        .join(', ');

    const params = items.flatMap((item) => [
            item.resourceId,
            item.column.name,
            item.column.position,
            item.column.dataType,
            item.column.characterMaximumLength,
            item.column.numericPrecision,
            item.column.numericScale,
            item.column.datetimePrecision,
            item.column.columnType,
            item.column.nullable,
            item.column.defaultValue,
            item.column.generated.isGenerated,
            item.column.generated.generationExpression,
            item.column.autoIncrement,
            item.column.extra,
            item.column.characterSetName,
            item.column.collationName,
            item.column.comment,
            scanId,
            scanId
        ]);

    await executor.query(`
        INSERT INTO Auto_Admin__fields (
            resource_id,
            column_name,
            ordinal_position,
            data_type,
            character_maximum_length,
            numeric_precision,
            numeric_scale,
            datetime_precision,
            column_type,
            is_nullable,
            default_value,
            is_generated,
            generation_expression,
            is_auto_increment,
            extra,
            character_set_name,
            collation_name,
            comment,
            first_seen_scan_id,
            last_seen_scan_id,
            state
        ) VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE
            ordinal_position = VALUES(ordinal_position),
            data_type = VALUES(data_type),
            character_maximum_length = VALUES(character_maximum_length),
            numeric_precision = VALUES(numeric_precision),
            numeric_scale = VALUES(numeric_scale),
            datetime_precision = VALUES(datetime_precision),
            column_type = VALUES(column_type),
            is_nullable = VALUES(is_nullable),
            default_value = VALUES(default_value),
            is_generated = VALUES(is_generated),
            generation_expression = VALUES(generation_expression),
            is_auto_increment = VALUES(is_auto_increment),
            extra = VALUES(extra),
            character_set_name = VALUES(character_set_name),
            collation_name = VALUES(collation_name),
            comment = VALUES(comment),
            state = VALUES(state),
            last_seen_scan_id = VALUES(last_seen_scan_id)
    `, params);
}

export const markFieldsMissing = async (executor: DbExecutor, fieldIds: number[]): Promise<void> => {
    if (fieldIds.length === 0) {
        return;
    }

    const placeholders = fieldIds.map(() => '?').join(', ');

    const [result] = await executor.query<ResultSetHeader>(`
        UPDATE Auto_Admin__fields 
        SET state = 'missing'
        WHERE id IN (${placeholders})
            AND state = 'present'
    `, fieldIds);

    if (result.affectedRows !== fieldIds.length) {
        throw new Error(`Expected ${fieldIds.length} rows to be affected, but got ${result.affectedRows}.`)
    }
}