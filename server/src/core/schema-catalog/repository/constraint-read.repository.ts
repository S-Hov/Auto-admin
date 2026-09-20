import type { DbExecutor } from "../../../db";
import type { StoredConstraint, StoredConstraintField } from "../types/schema-catalog.types";
import type { StoredConstraintFieldRow, StoredConstraintRow } from "./repository.types";

export const readStoredConstraints = async (
    executor: DbExecutor,
    schemaName: string,
): Promise<StoredConstraint[]> => {
    const [constraintRows] = await executor.query<StoredConstraintRow[]>(`
        SELECT
            c.id,
            c.resource_id,
            c.constraint_name,
            c.constraint_type,
            c.referenced_schema_name,
            c.referenced_table_name,
            c.referenced_resource_id,
            c.on_update,
            c.on_delete,
            c.state,
            c.first_seen_scan_id,
            c.last_seen_scan_id
        FROM Auto_Admin__constraints AS c
        INNER JOIN Auto_Admin__resources AS r ON r.id = c.resource_id
        WHERE r.schema_name = ?
        ORDER BY r.table_name, c.constraint_name
    `, [schemaName]);

    const [fieldRows] = await executor.query<StoredConstraintFieldRow[]>(`
        SELECT
            cf.id,
            cf.constraint_id,
            cf.ordinal_position,
            cf.field_id,
            f.column_name,
            cf.referenced_field_id,
            cf.referenced_column_name
        FROM Auto_Admin__constraint_fields AS cf
        INNER JOIN Auto_Admin__constraints AS c ON c.id = cf.constraint_id
        INNER JOIN Auto_Admin__resources AS r ON r.id = c.resource_id
        INNER JOIN Auto_Admin__fields AS f ON f.id = cf.field_id
        WHERE r.schema_name = ?
        ORDER BY cf.constraint_id, cf.ordinal_position
    `, [schemaName]);

    const fieldsByConstraintId = new Map<number, StoredConstraintField[]>();

    for (const row of fieldRows) {
        const fields = fieldsByConstraintId.get(row.constraint_id) ?? [];
        fields.push({
            id: row.id,
            constraintId: row.constraint_id,
            position: row.ordinal_position,
            fieldId: row.field_id,
            columnName: row.column_name,
            referencedFieldId: row.referenced_field_id,
            referencedColumnName: row.referenced_column_name,
        });
        fieldsByConstraintId.set(row.constraint_id, fields);
    }

    return constraintRows.map((row) => ({
        id: row.id,
        resourceId: row.resource_id,
        constraintName: row.constraint_name,
        type: row.constraint_type,
        referencedSchemaName: row.referenced_schema_name,
        referencedTableName: row.referenced_table_name,
        referencedResourceId: row.referenced_resource_id,
        onUpdate: row.on_update,
        onDelete: row.on_delete,
        state: row.state,
        firstSeenScanId: row.first_seen_scan_id,
        lastSeenScanId: row.last_seen_scan_id,
        fields: fieldsByConstraintId.get(row.id) ?? [],
    }));
};
