export const SUCCESS_CODES = {
    COMMON_OK: 'COMMON.OK', // Запрос успешен
    COMMON_CREATED: 'COMMON.CREATED', // Объект успешно создан
    COMMON_ACCEPTED: 'COMMON.ACCEPTED', // Запрос принят
    COMMON_NO_CONTENT: 'COMMON.NO_CONTENT', // Нет данных

    AUTH_LOGIN_SUCCEEDED: 'AUTH.LOGIN_SUCCEEDED', // Авторизация успешна
    AUTH_LOGOUT_SUCCEEDED: 'AUTH.LOGOUT_SUCCEEDED', // Выход успешен

    INSTALL_DATABASE_CONNECTED: 'INSTALL.DATABASE_CONNECTED', // Подключение к БД успешно
    INSTALL_MIGRATION_PLAN_RECEIVED: 'INSTALL.MIGRATION_PLAN_RECEIVED', // План миграции получен
    INSTALL_MIGRATION_APPLIED: 'INSTALL.MIGRATION_APPLIED', // Миграция применена
    INSTALL_ADMIN_CREATED: 'INSTALL.ADMIN_CREATED', // Администратор успешно создан

    BOOTSTRAP_STATUS_RECEIVED: 'BOOTSTRAP.STATUS_RECEIVED' // Статус загрузки получен
} as const;

export type SuccessCode = typeof SUCCESS_CODES[keyof typeof SUCCESS_CODES];