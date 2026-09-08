import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const envSchema = z.object({
    Auto_Admin__PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    Auto_Admin__HOST: z.string().trim().min(1).default("localhost"),
    Auto_Admin__NODE_ENV: z.enum(["development", "production", "test"] as const).default("development"),
    Auto_Admin__DB_HOST: z.string().optional(),
    Auto_Admin__DB_PORT: z.string().optional(),
    Auto_Admin__DB_DATABASE: z.string().optional(),
    Auto_Admin__DB_USERNAME: z.string().optional(),
    Auto_Admin__DB_PASSWORD: z.string().optional(),
    Auto_Admin__INSTALL_TOKEN: z.string().min(32, { message: "Токен должен содержать не менее 32 символов" }),
    Auto_Admin__CORS_ALLOWED_ORIGINS: z.string().optional(),
    Auto_Admin__LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    Auto_Admin__TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
    Auto_Admin__DB_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(5000),
    Auto_Admin__DB_QUERY_TIMEOUT_MS: z.coerce.number().int().min(1000).max(300000).default(30000),
    Auto_Admin__LOGIN_RATE_LIMIT: z.coerce.number().int().min(1).max(1000).default(10),
    Auto_Admin__LOGIN_RATE_WINDOW_MS: z.coerce.number().int().min(1000).max(3600000).default(60000),
    Auto_Admin__INSTALL_RATE_LIMIT: z.coerce.number().int().min(1).max(1000).default(5),
    Auto_Admin__INSTALL_RATE_WINDOW_MS: z.coerce.number().int().min(1000).max(3600000).default(60000),
    Auto_Admin__AUTH_USER_ATTEMPT_LIMIT: z.coerce.number().int().min(1).max(10000).default(10),
    Auto_Admin__AUTH_IP_ATTEMPT_LIMIT: z.coerce.number().int().min(1).max(100000).default(100),
    Auto_Admin__AUTH_IP_USER_ATTEMPT_LIMIT: z.coerce.number().int().min(1).max(10000).default(5),
    Auto_Admin__AUTH_SHORT_WINDOW_SECONDS: z.coerce.number().int().min(60).max(86400).default(900),
    Auto_Admin__AUTH_IP_WINDOW_SECONDS: z.coerce.number().int().min(60).max(604800).default(86400),
    Auto_Admin__LOGIN_ATTEMPT_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("Ошибка в переменных окружения (.env):");
    console.error(parsed.error.format());
    process.exit(1);
}

export const envConfig = parsed.data;
export type EnvConfig = z.infer<typeof envSchema>;
