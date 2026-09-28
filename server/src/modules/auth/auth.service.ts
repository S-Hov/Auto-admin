import { PagePaths } from "../../constants/pagePaths";
import { ERROR_CODES } from "../../shared/api/codes/error-codes";
import { tooManyRequests, unauthorized } from "../../shared/api/errors/error-helpers"
import { checkAuthToken } from "../../utils/checkAuthToken";
import type { RequestMeta } from "../../utils/getRequestMeta"
import { GetMeServiceResult, LoginData, LoginServiceResult, LogoutResponse } from "./auth.types"
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { envConfig } from '../../config/env';
import { activeAuthRepository } from "./repository/runtime/auth-repository.runtime";

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24;

const homePagePath = '/' as const;

export const loginService = async (data: LoginData, meta: RequestMeta): Promise<LoginServiceResult> => {
    const { userName, password } = data;
    const normalizeUsername = userName.trim().toLowerCase();

    const attemptId = await activeAuthRepository.createLoginAttempt(
        normalizeUsername,
        meta.ipAddress,
    );

    const attempts = await activeAuthRepository.getLoginAttempts(
        normalizeUsername,
        meta.ipAddress,
        {
            shortWindowSeconds:
                envConfig.Auto_Admin__AUTH_SHORT_WINDOW_SECONDS,
            ipWindowSeconds: envConfig.Auto_Admin__AUTH_IP_WINDOW_SECONDS,
        },
    );

    if (
        attempts.userCountInWindow >= envConfig.Auto_Admin__AUTH_USER_ATTEMPT_LIMIT
        || attempts.ipCountInWindow >= envConfig.Auto_Admin__AUTH_IP_ATTEMPT_LIMIT
        || attempts.ipUserCountInWindow >= envConfig.Auto_Admin__AUTH_IP_USER_ATTEMPT_LIMIT
    ) {
        throw tooManyRequests(ERROR_CODES.AUTH_TOO_MANY_ATTEMPTS, { params: { seconds: 900 } });
    }

    const user = await activeAuthRepository.getUserByUserName(normalizeUsername);
    if (!user || !user.is_active) {
        throw unauthorized(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
        throw unauthorized(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    }

    await activeAuthRepository.deleteLoginAttemptById(attemptId);

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await activeAuthRepository.createSession({
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

    const session = await activeAuthRepository.getActiveSessionByTokenHash(tokenHash);
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
    await activeAuthRepository.revokeSessionByTokenHash(tokenHash);

    return { redirectedTo: PagePaths.login };
}

export const cleanOldLoginAttempts = async (days: number): Promise<number> => {
    return activeAuthRepository.cleanOldLoginAttempts(days);
};
