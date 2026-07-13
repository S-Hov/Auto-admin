import bcrypt from 'bcrypt';
import type { RequestMeta, RegisterData } from "./register.types";
import { getRoleByKey, register } from './register.repository';
import { internal, notFound } from '../../../shared/api/errors/error-helpers';

const adminRoleKey = 'admin' as const

export const registerService = async (data: RegisterData, meta: RequestMeta): Promise<void> => {
    const {
        userName,
        password
    } = data;

    const hashedPassword = await bcrypt.hash(password, 10);

    const role = await getRoleByKey(adminRoleKey);

    if (!role) throw notFound('Роль администратора не найдена. Ригстрация не выполнена');

    try {
        await register(role?.id, userName, hashedPassword);
    }
    catch (error) {
        console.log('ошибка регистрации', '\n', error);
        throw internal('Не удалось создать пользователя');
    }

    
}