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
