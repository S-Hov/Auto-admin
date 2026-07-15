import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { getRequestMeta } from "../../utils/getRequestMeta";
import { loginService } from "./auth.service";
import type { LoginData } from './auth.types'

export const loginController = asyncHandler(async (req: Request, res: Response) => {
    const meta = getRequestMeta(req)

    const {
        userName,
        password,
    }: LoginData = req.body

    loginService({ userName, password }, meta)
})