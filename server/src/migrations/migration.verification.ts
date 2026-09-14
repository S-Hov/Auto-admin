import type { Connection, RowDataPacket } from 'mysql2/promise';

interface NameRow extends RowDataPacket {
    name: string;
}

interface RoleRow extends RowDataPacket {
    key: string;
    name: string;
    rights: string;
}

interface TableVerificationSpec {
    table: string;
    columns: readonly string[];
    indexes?: readonly string[];
    constraints?: readonly string[];
}

const tableSpecs: Readonly<Record<string, TableVerificationSpec>> = {
    '0001': {
        table: 'Auto_Admin__installation',
        columns: ['id', 'status', 'updated_at'],
        constraints: ['chk_only_one_row'],
    },
    '0002': {
        table: 'Auto_Admin__roles',
        columns: ['id', 'key', 'name', 'rights', 'created_at'],
    },
    '0003': {
        table: 'Auto_Admin__users',
        columns: ['id', 'role_id', 'username', 'password_hash', 'is_active', 'last_login_at', 'created_at', 'updated_at'],
        indexes: ['idx_users_role_id'],
        constraints: ['fk_users_role'],
    },
    '0004': {
        table: 'Auto_Admin__sessions',
        columns: ['id', 'user_id', 'token_hash', 'expires_at', 'created_at', 'revoked_at', 'last_seen_at', 'ip_address', 'user_agent'],
        indexes: ['uq_sessions_token_hash', 'idx_user_id', 'idx_expires_at'],
        constraints: ['fk_sessions_user'],
    },
    '0005': {
        table: 'Auto_Admin__login_attempts',
        columns: ['id', 'username', 'ip_address', 'created_at'],
        indexes: ['idx_user_ip_time', 'idx_ip_time', 'idx_user_time'],
    },
    '0006': {
        table: 'Auto_Admin__auth_logs',
        columns: ['id', 'user_id', 'event_type', 'ip_address', 'user_agent', 'created_at'],
        indexes: ['idx_auth_logs_user_id', 'idx_auth_logs_created_at'],
        constraints: ['fk_auth_logs_user'],
    },
    '0008': {
        table: 'Auto_Admin__menu',
        columns: ['id', 'parent_id', 'name', 'slug', 'icon', 'icon_type', 'sort_order', 'is_active', 'created_at', 'updated_at', 'updated_by'],
        indexes: ['idx_menu_parent_order'],
        constraints: ['fk_menu_parent', 'fk_menu_updated_by'],
    },
    '0009': {
        table: 'Auto_Admin__menu_role_permissions',
        columns: ['id', 'menu_id', 'role_id', 'can_view', 'can_create', 'can_update', 'can_delete'],
        indexes: ['uq_menu_role'],
        constraints: ['fk_menu_role_perm_menu', 'fk_menu_role_perm_role'],
    },
    '0010': {
        table: 'Auto_Admin__menu_user_permissions',
        columns: ['id', 'menu_id', 'user_id', 'can_view', 'can_create', 'can_update', 'can_delete'],
        indexes: ['uq_menu_user'],
        constraints: ['fk_menu_user_perm_menu', 'fk_menu_user_perm_user'],
    },
    '0011': {
        table: 'Auto_Admin__schema_scans',
        columns: [
            'id', 'status', 'schema_name', 'started_at', 'finished_at', 'snapshot_fingerprint',
            'added_resources', 'changed_resources', 'missing_resources',
            'added_fields', 'changed_fields', 'missing_fields',
            'error_code', 'created_by',
        ],
        indexes: ['idx_schema_scans_status_started_at'],
        constraints: ['fk_schema_scans_created_by'],
    },
    '0012': {
        table: 'Auto_Admin__resources',
        columns: [
            'id', 'schema_name', 'table_name', 'object_type', 'engine', 'comment',
            'is_service', 'state', 'first_seen_scan_id', 'last_seen_scan_id',
            'created_at', 'updated_at',
        ],
        indexes: ['uq_resources', 'idx_state_is_service'],
        constraints: ['fk_resources_first_seen', 'fk_resources_last_seen'],
    },
    '0013': {
        table: 'Auto_Admin__fields',
        columns: [
            'id', 'resource_id', 'column_name', 'ordinal_position', 'data_type', 'column_type',
            'is_nullable', 'default_value', 'character_maximum_length', 'numeric_precision',
            'numeric_scale', 'datetime_precision', 'character_set_name', 'collation_name',
            'is_auto_increment', 'is_generated', 'generation_expression', 'extra', 'comment',
            'state', 'first_seen_scan_id', 'last_seen_scan_id', 'created_at', 'updated_at',
        ],
        indexes: ['uq_fields', 'idx_resource_id_state_ordinal'],
        constraints: ['fk_fields_resource', 'fk_fields_first_seen', 'fk_fields_last_seen'],
    },
    '0014': {
        table: 'Auto_Admin__constraints',
        columns: [
            'id', 'resource_id', 'constraint_name', 'constraint_type',
            'referenced_schema_name', 'referenced_table_name', 'referenced_resource_id',
            'on_update', 'on_delete', 'state', 'first_seen_scan_id', 'last_seen_scan_id',
            'created_at', 'updated_at',
        ],
        indexes: ['uq_constraints', 'idx_resource_id_state', 'idx_referenced_resource'],
        constraints: [
            'fk_constraints_resource', 'fk_constraints_referenced_resource',
            'fk_constraints_first_seen', 'fk_constraints_last_seen',
        ],
    },
    '0015': {
        table: 'Auto_Admin__constraint_fields',
        columns: [
            'id', 'constraint_id', 'ordinal_position', 'field_id',
            'referenced_field_id', 'referenced_column_name', 'created_at', 'updated_at',
        ],
        indexes: [
            'uq_constraint_fields_ordinal', 'uq_constraint_fields_field',
            'idx_field_id', 'idx_referenced_field_id',
        ],
        constraints: [
            'fk_constraint_fields_constraint', 'fk_constraint_fields_field',
            'fk_constraint_fields_referenced_field',
        ],
    },
    '0016': {
        table: 'Auto_Admin__indexes',
        columns: [
            'id', 'resource_id', 'index_name', 'is_unique', 'index_type', 'is_visible',
            'comment', 'state', 'first_seen_scan_id', 'last_seen_scan_id',
            'created_at', 'updated_at',
        ],
        indexes: ['uq_indexes', 'idx_resource_id_state'],
        constraints: ['fk_indexes_resource', 'fk_indexes_first_seen', 'fk_indexes_last_seen'],
    },
    '0017': {
        table: 'Auto_Admin__index_parts',
        columns: [
            'id', 'index_id', 'ordinal_position', 'field_id', 'expression',
            'prefix_length', 'sort_direction', 'created_at', 'updated_at',
        ],
        indexes: ['uq_index_parts_by_index_position'],
        constraints: [
            'fk_index_parts_index', 'fk_index_parts_field', 'chk_index_parts_source',
        ],
    },
};

const containsAll = (actual: readonly string[], expected: readonly string[]): boolean => {
    const names = new Set(actual.map((name) => name.toLowerCase()));
    return expected.every((name) => names.has(name.toLowerCase()));
};

const verifyTable = async (connection: Connection, spec: TableVerificationSpec): Promise<boolean> => {
    const [columnRows] = await connection.query<NameRow[]>(`
        SELECT COLUMN_NAME AS name
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [spec.table]);

    if (!containsAll(columnRows.map((row) => row.name), spec.columns)) return false;

    if (spec.indexes?.length) {
        const [indexRows] = await connection.query<NameRow[]>(`
            SELECT DISTINCT INDEX_NAME AS name
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        `, [spec.table]);
        if (!containsAll(indexRows.map((row) => row.name), spec.indexes)) return false;
    }

    if (spec.constraints?.length) {
        const [constraintRows] = await connection.query<NameRow[]>(`
            SELECT CONSTRAINT_NAME AS name
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        `, [spec.table]);
        if (!containsAll(constraintRows.map((row) => row.name), spec.constraints)) return false;
    }

    return true;
};

const verifySeedRoles = async (connection: Connection): Promise<boolean> => {
    const [rows] = await connection.query<RoleRow[]>(`
        SELECT \`key\`, name, rights
        FROM Auto_Admin__roles
        WHERE \`key\` IN ('user', 'manager', 'admin')
    `);

    const roles = new Map(rows.map((row) => [row.key, row]));
    return roles.get('user')?.name === 'User'
        && roles.get('user')?.rights === 'read_only'
        && roles.get('manager')?.name === 'Manager'
        && roles.get('manager')?.rights === 'manager'
        && roles.get('admin')?.name === 'Admin'
        && roles.get('admin')?.rights === 'full';
};

export const verifyMigrationApplied = async (connection: Connection, version: string): Promise<boolean> => {
    if (version === '0007') return verifySeedRoles(connection);

    const spec = tableSpecs[version];
    if (!spec) return false;
    return verifyTable(connection, spec);
};
