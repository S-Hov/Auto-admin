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
        UNKNOWN_ERROR: 'Неизвестная ошибка',
        NETWORK_ERROR: 'Ошибка сети',

        OK: 'Запрос успешен',
        CREATED: 'Объект успешно создан',
        ACCEPTED: 'Запрос принят',
        NO_CONTENT: 'Нет данных',
    },

    AUTH: {
        INVALID_CREDENTIALS: 'Неверные учетные данные',
        SESSION_INVALID: 'Неверная сессия',
        TOO_MANY_ATTEMPTS: 'Слишком много попыток',

        LOGIN_SUCCEEDED: 'Логин успешен',
        LOGOUT_SUCCEEDED: 'Выход успешен',
        CURRENT_USER_RECEIVED: 'Информация об авторизованном пользователе успешно получена',
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
    
        DATABASE_CONNECTED: 'Подключение к БД успешно',
        MIGRATION_PLAN_RECEIVED: 'План миграции получен',
        MIGRATION_APPLIED: 'Миграция применена',
        ADMIN_CREATED: 'Администратор успешно создан',
    },

    BOOTSTRAP: {
        STATUS_RECEIVED: 'Статус загрузки получен',
    }
} as const;