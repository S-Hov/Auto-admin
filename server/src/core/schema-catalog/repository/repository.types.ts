import type { RowDataPacket } from "mysql2";
import type { AutoAdmin } from "../../../db/db.types";

export type StoredResourceRow =
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

export type StoredFieldRow =
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
