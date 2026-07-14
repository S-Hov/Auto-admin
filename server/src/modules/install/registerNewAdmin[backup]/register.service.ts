import bcrypt from 'bcryptjs';
import fs from 'fs';
import type { RequestMeta, RegisterData, RegisterResponse } from "./register.types";
import { getRoleByKey, register, registerLogger } from './register.repository';
import { internal, notFound } from '../../../shared/api/errors/error-helpers';

const adminRoleKey = 'admin' as const;
const loginPagePath = '/login' as const;

export const registerService = async (data: RegisterData, meta: RequestMeta): Promise<RegisterResponse> => {
    const {
        userName,
        password
    } = data;
    console.log('userName :', userName);

    const hashedPassword = await bcrypt.hash(password, 10);

    const role = await getRoleByKey(adminRoleKey);

    if (!role) throw notFound('Роль администратора не найдена. Ригстрация не выполнена');

    try {
        await register(role?.id, userName, hashedPassword);
        try {
            await registerLogger(meta)
        }
        catch (error){
            console.log('ошибка логгирования', '\n', error);
        }

        const pathToCurrentDir = __dirname;
        fs.rmSync(pathToCurrentDir, { recursive: true, force: true });
        console.log('[Install] Папка registerNewAdmin успешно удалена.');
    }
    catch (error) {
        console.log('ошибка регистрации', '\n', error);
        throw internal('Не удалось создать пользователя');
    }

    return ({redirectedTo: loginPagePath})
}