import { PagePaths } from "../../constants/pagePaths";
import { ERROR_CODES } from "../../shared/api/codes/error-codes";
import { tooManyRequests, unauthorized } from "../../shared/api/errors/error-helpers"
import { checkAuthToken } from "../../utils/checkAuthToken";
import type { RequestMeta } from "../../utils/getRequestMeta"
import { createLoginAttempt, createSession, deleteLoginAttemptById, getActiveSessionByTokenHash, getLoginAttempts, getUserByUserName, revokeSessionByTokenHash } from "./auth.repository"
import { GetMeServiceResult, LoginData, LoginServiceResult, LogoutResponse } from "./auth.types"
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24;

const homePagePath = '/' as const;

export const loginService = async (data: LoginData, meta: RequestMeta): Promise<LoginServiceResult> => {
    const { userName, password } = data;
    const normalizeUsername = userName.trim().toLowerCase();

    const attemptId = await createLoginAttempt(normalizeUsername, meta.ipAddress);

    const attempts = await getLoginAttempts(normalizeUsername, meta.ipAddress);

    if (attempts.userCount15m >= 10 || attempts.ipCount1d >= 100 || attempts.ipUserCount15m >= 5) {
        throw tooManyRequests(ERROR_CODES.AUTH_TOO_MANY_ATTEMPTS, { params: { seconds: 900 } });
    }

    const user = await getUserByUserName(userName);
    if (!user || !user.is_active) {
        throw unauthorized(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
        throw unauthorized(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    }

    await deleteLoginAttemptById(attemptId);

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await createSession({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        ip_address: meta.ipAddress,
        user_agent: meta.userAgent,
    });

    return { token, expiresAt, redirectedTo: homePagePath };
};

export const getMeService = async (token: string): Promise<GetMeServiceResult> => {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const session = await getActiveSessionByTokenHash(tokenHash);
    if (!session) throw unauthorized(ERROR_CODES.AUTH_SESSION_INVALID);

    const response: GetMeServiceResult = {
        userId: session.userId,
        username: session.username,
        roleId: session.roleId,
        roleKey: session.roleKey,
        expiresAt: session.expiresAt,
        rights: session.rights,
    };

    return response;
}

export const logoutService = async (token: unknown): Promise<LogoutResponse> => {
    if (!checkAuthToken(token)) return { redirectedTo: PagePaths.login };

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await revokeSessionByTokenHash(tokenHash);

    return { redirectedTo: PagePaths.login };
}