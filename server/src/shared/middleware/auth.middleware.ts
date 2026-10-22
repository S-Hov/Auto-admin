import type { NextFunction, Request, Response } from "express";
import { unauthorized } from "../api/errors/error-helpers";
import { COOKIE_NAMES } from "../../constants/cookies";
import { asyncHandler } from "../../utils/asyncHandler";
import { checkAuthToken } from "../../utils/checkAuthToken";
import { readAuthSession } from "../../modules/auth";
import { ERROR_CODES } from "../api/codes/error-codes";
import { requireSystemAdmin } from '../../core/access-control/policy/require-system-admin';

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.cookies[COOKIE_NAMES.AUTH_SESSION];

    if (!checkAuthToken(token)) throw unauthorized(ERROR_CODES.COMMON_UNAUTHORIZED);

    const session = await readAuthSession(token);

    req.auth = session;
    next();
})

export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
    requireSystemAdmin(req.auth!);
    next();
};
