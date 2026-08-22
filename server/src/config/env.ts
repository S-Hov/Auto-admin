import { z } from "zod";

export const envSchema = z
    .object({
        Auto_Admin__PORT: z
            .string()
            .default("3000"),
        Auto_Admin__HOST: z
            .string()
            .default("localhost"),
        Auto_Admin__NODE_ENV: z
            .enum(["development", "production", "test"] as const)
            .default("development"),
        Auto_Admin__DB_HOST: z
            .string()
            .optional(),
        Auto_Admin__DB_PORT: z
            .string()
            .optional(),
        Auto_Admin__DB_DATABASE: z
            .string()
            .optional(),
        Auto_Admin__DB_USERNAME: z
            .string()
            .optional(),
        Auto_Admin__DB_PASSWORD: z
            .string()
            .optional(),
        Auto_Admin__INSTALL_TOKEN: z
            .string()
            .min(32, { message: "Токен должен содержать не менее 32 символов" }),
        Auto_admin__CORS_ALLOWED_ORIGINS: z
            .string()
            .optional(),
    });