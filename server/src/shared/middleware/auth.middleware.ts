import type { NextFunction, Request, Response } from "express";
import { unauthorized } from "../api/errors/error-helpers";
import { getMeService } from "../../modules/auth/auth.service";
import { COOKIE_NAMES } from "../../constants/cookies";
import { asyncHandler } from "../../utils/asyncHandler";

const HEX_64_REGEX = /^[0-9a-f]{64}$/i;

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.cookies[COOKIE_NAMES.AUTH_SESSION];

    if (!token || typeof token !== 'string' || !HEX_64_REGEX.test(token)) {
        throw unauthorized();
    }

    const session = await getMeService(token);

    req.auth = session;
    next();
})