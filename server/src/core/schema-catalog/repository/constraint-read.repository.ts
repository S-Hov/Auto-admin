import type { DbExecutor } from "../../../db";
import type { StoredConstraintField } from "../types/schema-catalog.types";
import type { StoredConstrainRow, StoredConstraintFieldRow } from "./repository.types";

export const getStoredConstraints = async (executor: DbExecutor, schemaName: string): Promise<StoredConstrainRow[]> => {
    const [constraints] = await executor.query<StoredConstrainRow[]>(`
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
        FROM
            Auto_Admin__constraints AS c
        JOIN Auto_Admin__resources AS r ON c.resource_id = r.id
        WHERE
            r.schema_name = ?
        ORDER BY
            c.constraint_name;
    `, [schemaName]);

    return constraints;
};