import { RowDataPacket } from "mysql2";

export namespace AutoAdmin {
    export interface Installation extends RowDataPacket {
        id: number,
        status: 'new' | 'migrated' | 'ready',
        updated_at: Date;
    }

    export interface Role extends RowDataPacket {
        id: number;
        key: string;
        name: string;
        rights: 'full' | 'read_only' | 'manager' | 'none' | 'custom';
        created_at: Date;
    }

    export interface User extends RowDataPacket {
        id: number;
        role_id: number;
        username: string;
        password_hash: string;
        is_active: boolean;
        last_login_at: Date | null;
        created_at: Date;
        updated_at: Date;
    }

    export interface Session extends RowDataPacket {
        id: number;
        user_id: number;
        token_hash: string;
        expires_at: Date;
        created_at: Date;
        revoked_at: Date | null;
        last_seen_at: Date | null;
        ip_address: string | null;
        user_agent: string | null;
    }

    export interface Auth_logs extends RowDataPacket {
        id: number,
        user_id: number | null,
        event_type: string,
        ip_address: string | null,
        user_agent: string | null,
        created_at: Date,
    }

    export interface login_attempts extends RowDataPacket {
        id: number,
        username: string,
        ip_address: string | null,
        created_at: Date,
    }

    export interface Menu extends RowDataPacket {
        id: number;
        parent_id: number | null;
        name: string;
        slug: string;
        icon: string | null;
        icon_type: 'icon' | 'svg' | 'image' | 'video';
        sort_order: number;
        is_active: boolean;
        created_at: Date;
        updated_at: Date;
        updated_by: number | null;
    }

    export interface MenuRolePermission extends RowDataPacket {
        id: number;
        menu_id: number;
        role_id: number;
        can_view: boolean;
        can_create: boolean;
        can_update: boolean;
        can_delete: boolean;
    }

    export interface MenuUserPermission extends RowDataPacket {
        id: number;
        menu_id: number;
        user_id: number;
        can_view: boolean;
        can_create: boolean;
        can_update: boolean;
        can_delete: boolean;
    }

    export interface SchemaScan extends RowDataPacket {
        id: number;
        status: 'running' | 'succeeded' | 'failed';
        schema_name: string;
        started_at: Date;
        finished_at: Date | null;
        snapshot_fingerprint: string | null;
        added_resources: number;
        changed_resources: number;
        missing_resources: number;
        added_fields: number;
        changed_fields: number;
        missing_fields: number;
        error_code: string | null;
        created_by: number | null;
    }

    export interface Resource extends RowDataPacket {
        id: number;
        schema_name: string;
        table_name: string;
        object_type: 'table' | 'view';
        engine: string | null;
        comment: string | null;
        is_service: boolean;
        state: 'present' | 'missing';
        first_seen_scan_id: number;
        last_seen_scan_id: number;
        created_at: Date;
        updated_at: Date;
    }

    export interface Field extends RowDataPacket {
        id: number;
        resource_id: number;
        column_name: string;
        ordinal_position: number;
        data_type: string;
        column_type: string;
        is_nullable: boolean;
        default_value: string | null;
        character_maximum_length: number | null;
        numeric_precision: number | null;
        numeric_scale: number | null;
        datetime_precision: number | null;
        character_set_name: string | null;
        collation_name: string | null;
        is_auto_increment: boolean;
        is_generated: boolean;
        generation_expression: string | null;
        extra: string;
        comment: string | null;
        state: 'present' | 'missing';
        first_seen_scan_id: number;
        last_seen_scan_id: number;
        created_at: Date;
        updated_at: Date;
    }

    export interface Constraint extends RowDataPacket {
        id: number;
        resource_id: number;
        constraint_name: string;
        constraint_type: 'primary' | 'unique' | 'foreign';
        referenced_schema_name: string | null;
        referenced_table_name: string | null;
        referenced_resource_id: number | null;
        on_update: 'NO ACTION' | 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | null;
        on_delete: 'NO ACTION' | 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | null;
        state: 'present' | 'missing';
        first_seen_scan_id: number;
        last_seen_scan_id: number;
        created_at: Date;
        updated_at: Date;
    }

    export interface ConstraintField extends RowDataPacket {
        id: number;
        constraint_id: number;
        ordinal_position: number;
        field_id: number;
        referenced_field_id: number | null;
        referenced_column_name: string | null;
        created_at: Date;
        updated_at: Date;
    }

    export interface Index extends RowDataPacket {
        id: number;
        resource_id: number;
        index_name: string;
        is_unique: boolean;
        index_type: string;
        is_visible: boolean;
        comment: string | null;
        state: 'present' | 'missing';
        first_seen_scan_id: number;
        last_seen_scan_id: number;
        created_at: Date;
        updated_at: Date;
    }

    export interface IndexPart extends RowDataPacket {
        id: number;
        index_id: number;
        ordinal_position: number;
        field_id: number | null;
        expression: string | null;
        prefix_length: number | null;
        sort_direction: 'ASC' | 'DESC' | null;
        created_at: Date;
        updated_at: Date;
    }
}
