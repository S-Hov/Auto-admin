import type { NextFunction, Request, Response } from "express";
import { unauthorized } from "../api/errors/error-helpers";
import { getMeService } from "../../modules/auth/auth.service";
import { COOKIE_NAMES } from "../../constants/cookies";
import { asyncHandler } from "../../utils/asyncHandler";
import { checkAuthToken } from "../../utils/checkAuthToken";

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.cookies[COOKIE_NAMES.AUTH_SESSION];

    if (!checkAuthToken(token)) throw unauthorized();

    const session = await getMeService(token);

    req.auth = session;
    next();
})