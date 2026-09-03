import type { CookieOptions } from "express";

export const getAuthCookieOptions = (expiresAt?: Date): CookieOptions => ({
    httpOnly: true,
    secure: process.env.Auto_Admin__NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(expiresAt ? { expires: expiresAt } : {}),
});