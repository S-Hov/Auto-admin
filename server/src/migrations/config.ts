export const MIGRATIONS_TABLE = 'Auto_Admin__Schema_migrations' as const;
export const MIGRATION_HISTORY_TABLE = 'Auto_Admin__migration_history' as const;

export const MIGRATIONS_FILES_DIR = './src/migrations/sql/'

export const CREATE_MIGRATION_TABLE_KEY = 'createMigrationTable' as const;

export const MIGRATION_LOCK_NAME = 'auto-admin:migrations' as const;