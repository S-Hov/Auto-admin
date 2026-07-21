import { forbidden, internal, notFound } from "../../shared/api/errors/error-helpers"
import type { RequestMeta } from "../../utils/getRequestMeta"
import { getUserByUserName } from "./auth.repository"
import { LoginData } from "./auth.types"
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24

export const loginService = async (data: LoginData, meta: RequestMeta): Promise<string> => {
    const {
        userName,
        password
    } = data

    const user = await getUserByUserName(userName)
    if(!user) throw notFound('Пользователь с таким именем и паролем не найден')

    if(user.is_active) forbidden('Данный пользователь заблокирован')

    try {
        const match = await bcrypt.compare(password, user.password_hash)
        if(!match) throw notFound('Пользователь с таким именем и паролем не найден')
    }
    catch (err) {
        throw internal('Не Удалось проверить пароль')
    }

    const token = crypto.randomBytes(32);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const expiresAt = Date.now() + SESSION_TTL_MS

    return tokenHash
}

export const loginConfirmationService = async (id: Number) => {

}
