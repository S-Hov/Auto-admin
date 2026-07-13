import { Request, Response } from "express";
import { ok } from "../../../shared/api/success";
import { asyncHandler } from "../../../utils/asyncHandler";
import { registerService } from "./register.service";
import { RequestMeta } from "./register.types";

const getRequestMeta = (req: Request) => ({
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.get('user-agent') || null,
} as RequestMeta)

export const registerController = asyncHandler(async (req: Request, res: Response) => {
    console.log("запрос на регистрацию");
    const {
        userName,
        password,
        confirmPassword
    } = req.body

    const requestMeta = getRequestMeta(req)

    await registerService({userName, password, confirmPassword}, requestMeta)

    return ok(res, 'Соединение с базой данных установлено. Файл конфигурации создан');
})