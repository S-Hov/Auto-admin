import pino from 'pino';
import { envConfig } from '../../config/env';

const isDev = envConfig.Auto_Admin__NODE_ENV === 'development';

export const logger = pino({
    level: envConfig.Auto_Admin__LOG_LEVEL,
    redact: {
        paths: [
            'req.headers.cookie',
            'req.headers.authorization',
            'req.headers["x-auto-admin-install-token"]',
            '*.password',
            '*.confirmPassword',
            '*.token',
            '*.install_token',
            'err.config.password',
            'error.config.password',
            'reason.config.password',
            'cause.config.password',
            'req.body.password',
            'req.body.confirmPassword',
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
