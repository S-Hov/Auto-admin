import z from 'zod';

export const checkConnectionSchema = z.object({
    host: z
        .string({message: 'Неверный хост'})
        .trim()
        .min(1, {message: 'Хост не может быть пустым'})
        .max(255, {message: 'Слишком длинное значение хоста'}),
    port: z
        .number({message: 'Неверный порт'})
        .min(1, {message: 'Слишком маленькое значение порта'})
        .max(65535, {message: 'Слишком большое значение порта'}),
    database: z
        .string({message: 'Неверная база данных'})
        .trim()
        .min(1, {message: 'База не должна быть пустой'}),
    user: z
        .string({message: 'Неверное имя пользователя'})
        .trim()
        .min(1, {message: 'Имя пользователя не может быть пустым'}),
    password: z
        .string(),
})