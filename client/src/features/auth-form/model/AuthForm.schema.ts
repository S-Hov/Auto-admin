import { z } from 'zod';

export const AuthFormSchema = z
    .object({
        userName: z
            .string(),
        password: z
            .string(),
    })

export type AuthSchemaFormValues = z.infer<typeof AuthFormSchema>;
