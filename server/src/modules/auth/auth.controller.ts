import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { getRequestMeta } from "../../utils/getRequestMeta";
import { loginService, logoutService } from "./auth.service";
import type { GetMeServiceResult, LoginData, LoginResponse, LoginServiceResult, LogoutResponse } from './auth.types'
import { ok } from "../../shared/api/success";
import { COOKIE_NAMES } from "../../constants/cookies";
import { SUCCESS_CODES } from "../../shared/api/codes/success-codes";

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

    return ok<LoginResponse>(res, SUCCESS_CODES.AUTH_LOGIN_SUCCEEDED, { redirectedTo: data.redirectedTo });
})

export const getMeController = asyncHandler(async (req: Request, res: Response) => {
    return ok<GetMeServiceResult>(res, SUCCESS_CODES.AUTH_CURRENT_USER_RECEIVED, req.auth);
})

export const logoutController = asyncHandler(async (req: Request, res: Response) => {
    const token: unknown = req.cookies[COOKIE_NAMES.AUTH_SESSION];
    const data = await logoutService(token);

    res.clearCookie(COOKIE_NAMES.AUTH_SESSION, {
        secure: process.env.Auto_Admin__NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });
    return ok<LogoutResponse>(res, SUCCESS_CODES.AUTH_LOGOUT_SUCCEEDED, data);
})