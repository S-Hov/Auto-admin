import z from "zod";

export const applyNextMigrationRequestSchema = z.object({
    expectedVersion: z
        .string({ message: 'Неверный формат версии' })
        .regex(/^\d{4}$/, { message: 'Версия должна состоять из 4 цифр' })
});

export type ApplyNextMigrationData = z.infer<typeof applyNextMigrationRequestSchema>
