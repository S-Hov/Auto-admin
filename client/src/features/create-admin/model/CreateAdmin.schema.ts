import { z } from 'zod';

export const CreateAdminSchema = z
    .object({
        userName: z
            .string()
            .min(3, { message: 'Имя должно содержать не менее 3 символов' })
            .max(20, { message: 'Имя не должно превышать 20 символов' }),

        password: z
            .string()
            .min(6, { message: 'Пароль администратора должен быть не менее 6 символов' })
            .max(100, { message: 'Пароль слишком длинный' })
            .refine((val) => /\d/.test(val), {
                message: 'Пароль должен содержать хотя бы одну цифру',
            })
            .refine((val) => /[a-z]/.test(val) && /[A-Z]/.test(val), {
                message: 'Пароль должен содержать заглавные и строчные буквы',
            })
            .refine((val) => /[!@#$%^&*(),.?":{}|<>_]/.test(val), {
                message: 'Пароль должен содержать хотя бы один спецсимвол (!@#$%^&*)',
            }),

        confirm_password: z.string().min(6, { message: 'Пароль администратора должен быть не менее 6 символов' }),
    })
    .refine((data) => data.password === data.confirm_password, {
        message: 'Пароли не совпадают',
        path: ['confirm_password'],
    });

export type CreateAdminFormValues = z.infer<typeof CreateAdminSchema>;
