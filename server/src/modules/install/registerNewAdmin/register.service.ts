import bcrypt from 'bcryptjs';
import type { RequestMeta, RegisterData, RegisterResponse } from "./register.types";
import { getAdminByRoleId, getRoleByKey, register, registerLogger } from './register.repository';
import { conflict, internal, notFound } from '../../../shared/api/errors/error-helpers';

const adminRoleKey = 'admin' as const;
const loginPagePath = '/auth/login' as const;

export const registerService = async (data: RegisterData, meta: RequestMeta): Promise<RegisterResponse> => {
    const {
        userName,
        password
    } = data;

    const role = await getRoleByKey(adminRoleKey);

    if (!role) throw notFound('Роль администратора не найдена. Регистрация не выполнена');

    const hashedPassword = await bcrypt.hash(password, 10);

    const admins = await getAdminByRoleId(role.id)

    if (admins) throw conflict('Администратор уже создан')

    try {
        await register(role?.id, userName, hashedPassword);

        await registerLogger(meta)
    }
    catch (error) {
        console.log('ошибка регистрации', '\n', error);
        throw internal('Не удалось создать пользователя');
    }

    return ({ redirectedTo: loginPagePath })
}