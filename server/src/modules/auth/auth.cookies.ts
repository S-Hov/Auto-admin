import type { CookieOptions } from "express";
import { envConfig } from "../../config/env";

export const getAuthCookieOptions = (expiresAt?: Date): CookieOptions => ({
    httpOnly: true,
    secure: envConfig.Auto_Admin__NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(expiresAt ? { expires: expiresAt } : {}),
});
