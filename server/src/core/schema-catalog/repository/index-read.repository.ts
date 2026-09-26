import type { DatabaseExecutor } from "../../../db/contracts/executor.interface";
import type {
    StoredIndex,
    StoredIndexPart,
} from "../types/schema-catalog.types";
import type { StoredIndexPartRow, StoredIndexRow } from "./repository.types";

export const readStoredIndexes = async (
    executor: DatabaseExecutor,
    schemaName: string,
): Promise<StoredIndex[]> => {
    const indexRows = await executor.queryRows<StoredIndexRow>(
        `
            SELECT
                i.id,
                i.resource_id,
                i.index_name,
                i.is_unique,
                i.index_type,
                i.is_visible,
                i.comment,
                i.state,
                i.first_seen_scan_id,
                i.last_seen_scan_id
            FROM Auto_Admin__indexes AS i
            INNER JOIN Auto_Admin__resources AS r ON r.id = i.resource_id
            WHERE r.schema_name = ?
            ORDER BY r.table_name, i.index_name
        `,
        [schemaName],
    );

    const partRows = await executor.queryRows<StoredIndexPartRow>(
        `
            SELECT
                ip.id,
                ip.index_id,
                ip.ordinal_position,
                ip.field_id,
                f.column_name,
                ip.expression,
                ip.prefix_length,
                ip.sort_direction
            FROM Auto_Admin__index_parts AS ip
            INNER JOIN Auto_Admin__indexes AS i ON i.id = ip.index_id
            INNER JOIN Auto_Admin__resources AS r ON r.id = i.resource_id
            LEFT JOIN Auto_Admin__fields AS f ON f.id = ip.field_id
            WHERE r.schema_name = ?
            ORDER BY ip.index_id, ip.ordinal_position
        `,
        [schemaName],
    );

    const partsByIndexId = new Map<number, StoredIndexPart[]>();

    for (const row of partRows) {
        const parts = partsByIndexId.get(row.index_id) ?? [];

        if (
            row.field_id !== null &&
            row.column_name !== null &&
            row.expression === null
        ) {
            parts.push({
                id: row.id,
                indexId: row.index_id,
                position: row.ordinal_position,
                fieldId: row.field_id,
                kind: "column",
                columnName: row.column_name,
                expression: null,
                prefixLength: row.prefix_length,
                sortDirection: row.sort_direction,
            });
        } else if (row.field_id === null && row.expression !== null) {
            parts.push({
                id: row.id,
                indexId: row.index_id,
                position: row.ordinal_position,
                fieldId: null,
                kind: "expression",
                columnName: null,
                expression: row.expression,
                prefixLength: row.prefix_length,
                sortDirection: row.sort_direction,
            });
        } else {
            throw new Error(`Index part ${row.id} has an invalid source`);
        }

        partsByIndexId.set(row.index_id, parts);
    }

    return indexRows.map((row) => ({
        id: row.id,
        resourceId: row.resource_id,
        name: row.index_name,
        isUnique: Boolean(row.is_unique),
        indexType: row.index_type,
        isVisible: Boolean(row.is_visible),
        comment: row.comment,
        state: row.state,
        firstSeenScanId: row.first_seen_scan_id,
        lastSeenScanId: row.last_seen_scan_id,
        parts: partsByIndexId.get(row.id) ?? [],
    }));
};
