import { z } from 'zod';

export const installDatabaseSchema = z.object({
    host: z.string().min(1, { message: "Укажи host" }),
    
    port: z.number({ message: "Порт должен быть числом" })
        .int('Порт должен быть целым числом')
        .min(1, { message: "Минимальное значение порта - 1" })
        .max(65535, { message: "Максимальное значение порта - 65535" }),
        
    database: z.string().min(1, { message: "Укажи имя базы данных" }),
    user: z.string().min(1, 'Укажи пользователя'),
    password: z.string(),
    install_token: z.string().min(32, 'Минимальная длина токена - 32 символа'),
});

export type InstallDatabaseFormValues = z.infer<typeof installDatabaseSchema>;
