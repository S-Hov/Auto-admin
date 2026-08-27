export const enApi = {
    COMMON: {
        BAD_REQUEST: 'Invalid request',
        UNAUTHORIZED: 'Unauthorized',
        FORBIDDEN: 'Forbidden',
        NOT_FOUND: 'Not found',
        CONFLICT: 'Conflict',
        TOO_MANY_REQUESTS: 'Too many requests',
        VALIDATION_FAILED: 'Validation failed',
        INTERNAL_ERROR: 'Internal server error',
    },

    AUTH: {
        INVALID_CREDENTIALS: 'Invalid credentials',
        SESSION_INVALID: 'Invalid session',
        TOO_MANY_ATTEMPTS: 'Too many attempts',
    },

    INSTALL: {
        INVALID_SETUP_TOKEN: 'Invalid setup token',
        DATABASE_CONNECTION_FAILED: 'Database connection failed',
        DATABASE_CONFIGURATION_NOT_ALLOWED: 'Database configuration not allowed',
        MIGRATIONS_ALREADY_COMPLETED: 'Migrations already completed',
        MIGRATIONS_ALREADY_RUNNING: 'Migrations already running',
        MIGRATION_VERSION_CONFLICT: 'Migration version conflict',
        ADMIN_ALREADY_CREATED: 'Admin already created',
        ADMIN_ROLE_NOT_FOUND: 'Admin role not found',
    }
} as const;