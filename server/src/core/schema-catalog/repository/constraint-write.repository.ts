import type { ResultSetHeader } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import type {
    ConstraintFieldWriteItem,
    ConstraintWriteItem,
} from "../contracts/schema-catalog-repository.types";

export const upsertPresentConstraints = async (
    connection: PoolConnection,
    items: ConstraintWriteItem[],
    scanId: number,
): Promise<void> => {
    if (items.length === 0) return;

    const placeholders = items
        .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'present')")
        .join(", ");
    const values = items.flatMap((item) => [
        item.resourceId,
        item.constraintName,
        item.type,
        item.referencedSchemaName,
        item.referencedTableName,
        item.referencedResourceId,
        item.onUpdate,
        item.onDelete,
        scanId,
        scanId,
    ]);

    await connection.query<ResultSetHeader>(
        `
        INSERT INTO Auto_Admin__constraints
            (resource_id, constraint_name, constraint_type,
             referenced_schema_name, referenced_table_name, referenced_resource_id,
             on_update, on_delete, first_seen_scan_id, last_seen_scan_id, state)
        VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE
            constraint_type = VALUES(constraint_type),
            referenced_schema_name = VALUES(referenced_schema_name),
            referenced_table_name = VALUES(referenced_table_name),
            referenced_resource_id = VALUES(referenced_resource_id),
            on_update = VALUES(on_update),
            on_delete = VALUES(on_delete),
            last_seen_scan_id = VALUES(last_seen_scan_id),
            state = 'present'
    `,
        values,
    );
};

export const markConstraintsMissing = async (
    connection: PoolConnection,
    ids: number[],
): Promise<void> => {
    if (ids.length === 0) return;
    await connection.query<ResultSetHeader>(
        `
        UPDATE Auto_Admin__constraints
        SET state = 'missing'
        WHERE id IN (${ids.map(() => "?").join(", ")})
    `,
        ids,
    );
};

export const replaceConstraintFields = async (
    connection: PoolConnection,
    constraintIds: number[],
    items: ConstraintFieldWriteItem[],
): Promise<void> => {
    if (constraintIds.length === 0) return;

    await connection.query<ResultSetHeader>(
        `
        DELETE FROM Auto_Admin__constraint_fields
        WHERE constraint_id IN (${constraintIds.map(() => "?").join(", ")})
    `,
        constraintIds,
    );

    if (items.length === 0) return;

    const placeholders = items.map(() => "(?, ?, ?, ?, ?)").join(", ");
    const values = items.flatMap((item) => [
        item.constraintId,
        item.position,
        item.fieldId,
        item.referencedFieldId,
        item.referencedColumnName,
    ]);

    await connection.query<ResultSetHeader>(
        `
        INSERT INTO Auto_Admin__constraint_fields
            (constraint_id, ordinal_position, field_id, referenced_field_id, referenced_column_name)
        VALUES ${placeholders}
    `,
        values,
    );
};
