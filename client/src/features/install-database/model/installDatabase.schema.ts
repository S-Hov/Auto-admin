import { z } from 'zod';

export const installDatabaseSchema = z.object({
    host: z
        .string({ message: 'Неверный хост' })
        .trim()
        .min(1, { message: 'Хост не может быть пустым' })
        .max(255, { message: 'Слишком длинное значение хоста' }),
    port: z
        .number({ message: 'Неверный порт' })
        .int({ message: 'Порт должен быть целым числом' })
        .min(1, { message: 'Слишком маленькое значение порта' })
        .max(65535, { message: 'Слишком большое значение порта' }),
    database: z
        .string({ message: 'Неверная база данных' })
        .trim()
        .min(1, { message: 'База не должна быть пустой' })
        .max(64, { message: 'База данных не должна превышать 64 символа' }),
    user: z
        .string({ message: 'Неверное имя пользователя' })
        .trim()
        .min(1, { message: 'Имя пользователя не может быть пустым' })
        .max(32, { message: 'Имя пользователя не должно превышать 32 символа' }),
    password: z
        .string()
        .max(255, { message: 'Пароль не должен превышать 255 символов' }),
    install_token: z
        .string()
        .min(32, 'Минимальная длина токена - 32 символа'),
});

export type InstallDatabaseFormValues = z.infer<typeof installDatabaseSchema>;
