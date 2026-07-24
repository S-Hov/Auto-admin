import { unauthorized } from "../../shared/api/errors/error-helpers"
import type { RequestMeta } from "../../utils/getRequestMeta"
import { createSession, getUserByUserName } from "./auth.repository"
import { CreateSessionData, LoginData, LoginServiceResult } from "./auth.types"
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24

export const loginService = async (data: LoginData, meta: RequestMeta): Promise<LoginServiceResult> => {
    const {
        userName,
        password
    } = data

    const user = await getUserByUserName(userName)
    if (!user) throw unauthorized('Пользователь с таким именем и паролем не найден')

    if (!user.is_active) throw unauthorized('Пользователь с таким именем и паролем не найден')

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) throw unauthorized('Пользователь с таким именем и паролем не найден')

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

    const createSessionData: CreateSessionData = {
        'user_id': user.id,
        'token_hash': tokenHash,
        'expires_at': expiresAt,
        'ip_address': meta.ipAddress,
        'user_agent': meta.userAgent,
    }

    await createSession(createSessionData)

    return {token, expiresAt}
}

export const loginConfirmationService = async (id: Number) => {

}