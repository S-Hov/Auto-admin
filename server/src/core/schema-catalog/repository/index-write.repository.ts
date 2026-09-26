import type { ResultSetHeader } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import type {
    IndexPartWriteItem,
    IndexWriteItem,
} from "../contracts/schema-catalog-repository.types";

export const upsertPresentIndexes = async (
    connection: PoolConnection,
    items: IndexWriteItem[],
    scanId: number,
): Promise<void> => {
    if (items.length === 0) return;

    const placeholders = items
        .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, 'present')")
        .join(", ");
    const values = items.flatMap(({ resourceId, index }) => [
        resourceId,
        index.name,
        index.isUnique,
        index.indexType,
        index.isVisible,
        index.comment,
        scanId,
        scanId,
    ]);

    await connection.query<ResultSetHeader>(
        `
        INSERT INTO Auto_Admin__indexes
            (resource_id, index_name, is_unique, index_type, is_visible, comment,
             first_seen_scan_id, last_seen_scan_id, state)
        VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE
            is_unique = VALUES(is_unique),
            index_type = VALUES(index_type),
            is_visible = VALUES(is_visible),
            comment = VALUES(comment),
            last_seen_scan_id = VALUES(last_seen_scan_id),
            state = 'present'
    `,
        values,
    );
};

export const markIndexesMissing = async (
    connection: PoolConnection,
    ids: number[],
): Promise<void> => {
    if (ids.length === 0) return;
    await connection.query<ResultSetHeader>(
        `
        UPDATE Auto_Admin__indexes
        SET state = 'missing'
        WHERE id IN (${ids.map(() => "?").join(", ")})
    `,
        ids,
    );
};

export const replaceIndexParts = async (
    connection: PoolConnection,
    indexIds: number[],
    items: IndexPartWriteItem[],
): Promise<void> => {
    if (indexIds.length === 0) return;

    await connection.query<ResultSetHeader>(
        `
        DELETE FROM Auto_Admin__index_parts
        WHERE index_id IN (${indexIds.map(() => "?").join(", ")})
    `,
        indexIds,
    );

    if (items.length === 0) return;

    const placeholders = items.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
    const values = items.flatMap((item) => [
        item.indexId,
        item.position,
        item.fieldId,
        item.expression,
        item.prefixLength,
        item.sortDirection,
    ]);

    await connection.query<ResultSetHeader>(
        `
        INSERT INTO Auto_Admin__index_parts
            (index_id, ordinal_position, field_id, expression, prefix_length, sort_direction)
        VALUES ${placeholders}
    `,
        values,
    );
};
