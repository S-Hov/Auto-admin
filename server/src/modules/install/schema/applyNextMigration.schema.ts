import z from "zod";

export const applyNextMigrationSchema = z.object({
    expectedVersion: z
    .string({message: 'Неверный формат версии'})
    .regex(/^\d{4}$/, {message: 'Версия должна состоять из 4 цифр'})
})