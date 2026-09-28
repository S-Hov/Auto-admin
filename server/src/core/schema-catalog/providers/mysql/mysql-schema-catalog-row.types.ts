import type { ForeignKeyAction } from "../../types/schema-catalog.types";

type MySqlBoolean = boolean | 0 | 1;
type StoredState = "present" | "missing";

export interface StoredResourceRow {
    id: number;
    schema_name: string;
    table_name: string;
    object_type: "table" | "view";
    engine: string | null;
    comment: string | null;
    is_service: MySqlBoolean;
    state: StoredState;
    first_seen_scan_id: number;
    last_seen_scan_id: number;
}

export interface StoredFieldRow {
    id: number;
    resource_id: number;
    column_name: string;
    ordinal_position: number;
    data_type: string;
    column_type: string;
    is_nullable: MySqlBoolean;
    default_value: string | null;
    character_maximum_length: number | null;
    numeric_precision: number | null;
    numeric_scale: number | null;
    datetime_precision: number | null;
    character_set_name: string | null;
    collation_name: string | null;
    is_auto_increment: MySqlBoolean;
    is_generated: MySqlBoolean;
    generation_expression: string | null;
    extra: string;
    comment: string | null;
    state: StoredState;
    first_seen_scan_id: number;
    last_seen_scan_id: number;
}

export interface StoredConstraintRow {
    id: number;
    resource_id: number;
    constraint_name: string;
    constraint_type: "primary" | "unique" | "foreign";
    referenced_schema_name: string | null;
    referenced_table_name: string | null;
    referenced_resource_id: number | null;
    on_update: ForeignKeyAction | null;
    on_delete: ForeignKeyAction | null;
    state: StoredState;
    first_seen_scan_id: number;
    last_seen_scan_id: number;
}

export interface StoredConstraintFieldRow {
    id: number;
    constraint_id: number;
    ordinal_position: number;
    field_id: number;
    column_name: string;
    referenced_field_id: number | null;
    referenced_column_name: string | null;
}

export interface StoredIndexRow {
    id: number;
    resource_id: number;
    index_name: string;
    is_unique: MySqlBoolean;
    index_type: string;
    is_visible: MySqlBoolean;
    comment: string | null;
    state: StoredState;
    first_seen_scan_id: number;
    last_seen_scan_id: number;
}

export interface StoredIndexPartRow {
    id: number;
    index_id: number;
    ordinal_position: number;
    field_id: number | null;
    column_name: string | null;
    expression: string | null;
    prefix_length: number | null;
    sort_direction: "ASC" | "DESC" | null;
}
