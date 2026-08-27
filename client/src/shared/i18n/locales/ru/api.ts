export const ruApi = {
    COMMON: {
        BAD_REQUEST: 'Неверный запрос',
        UNAUTHORIZED: 'Не авторизован',
        FORBIDDEN: 'Отказано в доступе',
        NOT_FOUND: 'Не найдено',
        CONFLICT: 'Конфликт',
        TOO_MANY_REQUESTS: 'Слишком много запросов',
        VALIDATION_FAILED: 'Ошибка валидации',
        INTERNAL_ERROR: 'Внутренняя ошибка',
    },

    AUTH: {
        INVALID_CREDENTIALS: 'Неверные учетные данные',
        SESSION_INVALID: 'Неверная сессия',
        TOO_MANY_ATTEMPTS: 'Слишком много попыток',
    },

    INSTALL: {
        INVALID_SETUP_TOKEN: 'Неверный токен настройки',
        DATABASE_CONNECTION_FAILED: 'Ошибка подключения к базе данных',
        DATABASE_CONFIGURATION_NOT_ALLOWED: 'Конфигурация базы данных не разрешена',
        MIGRATIONS_ALREADY_COMPLETED: 'Миграции уже завершены',
        MIGRATIONS_ALREADY_RUNNING: 'Миграции уже запущены',
        MIGRATION_VERSION_CONFLICT: 'Конфликт версий миграций',
        ADMIN_ALREADY_CREATED: 'Администратор уже создан',
        ADMIN_ROLE_NOT_FOUND: 'Роль администратора не найдена',
    }
} as const;