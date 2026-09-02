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
        UNKNOWN_ERROR: 'Unknown error',
        NETWORK_ERROR: 'Network error',

        OK: 'OK',
        CREATED: 'Created',
        ACCEPTED: 'Accepted',
        NO_CONTENT: 'No content',
    },

    AUTH: {
        INVALID_CREDENTIALS: 'Invalid credentials',
        SESSION_INVALID: 'Invalid session',
        TOO_MANY_ATTEMPTS: 'Too many attempts',

        LOGIN_SUCCEEDED: 'Login succeeded',
        LOGOUT_SUCCEEDED: 'Logout succeeded',
        CURRENT_USER_RECEIVED: 'Current user information received',
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

        DATABASE_CONNECTED: 'Database connected',
        MIGRATION_PLAN_RECEIVED: 'Migration plan received',
        MIGRATION_APPLIED: 'Migration step applied',
        ADMIN_CREATED: 'Admin created',
    },

    BOOTSTRAP: {
        STATUS_RECEIVED: 'Status received',
    },

    VALIDATION: {
        REQUIRED: 'Required field',
        INVALID_TYPE: 'Invalid data type',
        STRING_TOO_SHORT: 'Minimum length: {{min}} chars',
        STRING_TOO_LONG: 'Maximum length: {{max}} chars',
        NUMBER_TOO_SMALL: 'Value must be at least {{min}}',
        NUMBER_TOO_LARGE: 'Value must be at most {{max}}',
        PASSWORDS_DO_NOT_MATCH: 'Passwords do not match',
        INVALID_VALUE: 'Invalid value',
    }
} as const;