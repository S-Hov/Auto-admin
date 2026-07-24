import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { getRequestMeta } from "../../utils/getRequestMeta";
import { loginService, logoutService } from "./auth.service";
import type { GetMeServiceResult, LoginData, LoginResponse, LoginServiceResult, LogoutResponse } from './auth.types'
import { ok } from "../../shared/api/success";
import { COOKIE_NAMES } from "../../constants/cookies";

export const loginController = asyncHandler(async (req: Request, res: Response) => {
    const meta = getRequestMeta(req);

    const {
        userName,
        password,
    }: LoginData = req.body;

    const data: LoginServiceResult = await loginService({ userName, password }, meta);

    res.cookie(COOKIE_NAMES.AUTH_SESSION, data.token, {
        httpOnly: true,
        secure: process.env.Auto_Admin__NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: data.expiresAt,
    });

    return ok<LoginResponse>(res, 'Выполнен успешный вход в систему', {redirectedTo: data.redirectedTo});
})

export const getMeController = asyncHandler(async (req: Request, res: Response) => {
    return ok<GetMeServiceResult>(res, 'Успешно', req.auth);
})

export const logoutController = asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies[COOKIE_NAMES.AUTH_SESSION]
    const data = await logoutService(token);
    res.clearCookie(COOKIE_NAMES.AUTH_SESSION, {
        secure: process.env.Auto_Admin__NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });
    return ok<LogoutResponse>(res, 'Вы успешно вышли из системы', data);
})