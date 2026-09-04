import pino from 'pino';

const isDev = process.env.Auto_Admin__NODE_ENV === 'development';

export const logger = pino({
    level: process.env.Auto_Admin__LOG_LEVEL || 'info',
    redact: {
        paths: [
            'req.headers.cookie',
            'req.headers.authorization',
            'req.headers["x-auto-admin-install-token"]',
            '*.password',
            '*.confirmPassword',
            '*.token',
            '*.install_token',
        ],
        censor: '[REDACTED]',
    },
    transport: isDev
        ? {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:standard' },
        }
        : undefined,
});