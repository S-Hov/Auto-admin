import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { getRequestMeta } from "../../utils/getRequestMeta";
import { getMeService, loginService } from "./auth.service";
import type { LoginData, LoginResponse, LoginServiceResult } from './auth.types'
import { ok } from "../../shared/api/success";

export const loginController = asyncHandler(async (req: Request, res: Response) => {
    const meta = getRequestMeta(req);

    const {
        userName,
        password,
    }: LoginData = req.body;

    const data: LoginServiceResult = await loginService({ userName, password }, meta);

    res.cookie('Auto_Admin_session', data.token, {
        httpOnly: true,
        secure: process.env.Auto_Admin__NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: data.expiresAt,
    })

    return ok<LoginResponse>(res, 'Выполнен успешный вход в систему', {redirectedTo: data.redirectedTo})
})

export const getMeController = asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies.Auto_Admin_session;

    const session = await getMeService(token)

    return ok(res, 'Успешно', session)
})