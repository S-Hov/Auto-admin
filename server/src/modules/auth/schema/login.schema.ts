import { z } from "zod";

export const loginSchema = z
    .object({
        userName: z
            .string()
            .min(3, { message: 'Имя должно содержать не менее 3 символов' })
            .max(20, { message: 'Имя не должно превышать 20 символов' }),

        password: z
            .string()
            .min(1)
            .max(100)
    });