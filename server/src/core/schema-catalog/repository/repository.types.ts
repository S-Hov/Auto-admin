import type { RowDataPacket } from "mysql2";
import type { AutoAdmin } from "../../../db/legacy/mysql-table.types";

export type StoredResourceRow = RowDataPacket &
    Pick<
        AutoAdmin.Resource,
        | "id"
        | "schema_name"
        | "table_name"
        | "object_type"
        | "engine"
        | "comment"
        | "is_service"
        | "state"
        | "first_seen_scan_id"
        | "last_seen_scan_id"
    >;

export type StoredFieldRow = RowDataPacket &
    Pick<
        AutoAdmin.Field,
        | "id"
        | "resource_id"
        | "column_name"
        | "ordinal_position"
        | "data_type"
        | "column_type"
        | "is_nullable"
        | "default_value"
        | "character_maximum_length"
        | "numeric_precision"
        | "numeric_scale"
        | "datetime_precision"
        | "character_set_name"
        | "collation_name"
        | "is_auto_increment"
        | "is_generated"
        | "generation_expression"
        | "extra"
        | "comment"
        | "state"
        | "first_seen_scan_id"
        | "last_seen_scan_id"
    >;

export type StoredConstraintRow = RowDataPacket &
    Pick<
        AutoAdmin.Constraint,
        | "id"
        | "resource_id"
        | "constraint_name"
        | "constraint_type"
        | "referenced_schema_name"
        | "referenced_table_name"
        | "referenced_resource_id"
        | "on_update"
        | "on_delete"
        | "state"
        | "first_seen_scan_id"
        | "last_seen_scan_id"
    >;

export type StoredConstraintFieldRow = RowDataPacket &
    Pick<
        AutoAdmin.ConstraintField,
        | "id"
        | "constraint_id"
        | "ordinal_position"
        | "field_id"
        | "referenced_field_id"
        | "referenced_column_name"
    > & { column_name: string };

export type StoredIndexRow = RowDataPacket &
    Pick<
        AutoAdmin.Index,
        | "id"
        | "resource_id"
        | "index_name"
        | "is_unique"
        | "index_type"
        | "is_visible"
        | "comment"
        | "state"
        | "first_seen_scan_id"
        | "last_seen_scan_id"
    >;

export type StoredIndexPartRow = RowDataPacket &
    Pick<
        AutoAdmin.IndexPart,
        | "id"
        | "index_id"
        | "ordinal_position"
        | "field_id"
        | "expression"
        | "prefix_length"
        | "sort_direction"
    > & { column_name: string | null };
