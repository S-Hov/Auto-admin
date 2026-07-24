import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { getRequestMeta } from "../../utils/getRequestMeta";
import { loginService } from "./auth.service";
import type { LoginData } from './auth.types'
import { ok } from "../../shared/api/success";

export const loginController = asyncHandler(async (req: Request, res: Response) => {
    const meta = getRequestMeta(req);

    const {
        userName,
        password,
    }: LoginData = req.body;

    const data = await loginService({ userName, password }, meta);

    res.cookie('auto_admin_session', data.token, {
        httpOnly: true,
        secure: process.env.Auto_Admin__SYSTEM_MODE === 'production',
        sameSite: 'lax',
        path: '/',
        expires: data.expiresAt,
    })

    return ok(res, 'Выполнен успешный вход в систему')
})