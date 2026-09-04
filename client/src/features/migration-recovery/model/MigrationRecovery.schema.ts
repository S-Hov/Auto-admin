import z from "zod";

export const MigrationRecoverySchema = z.object({
    install_token: z
        .string()
        .min(32, 'Минимальная длина токена - 32 символа'),
});

export type MigrationRecoveryFormValues = z.infer<typeof MigrationRecoverySchema>;