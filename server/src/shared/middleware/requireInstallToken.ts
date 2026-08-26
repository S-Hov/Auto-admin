import type { NextFunction, Request, Response } from "express";
import { unauthorized } from "../api/errors/error-helpers";
import crypto from 'crypto';
import { ERROR_CODES } from "../api/codes/error-codes";

const clientTokenName = 'x-auto-admin-install-token';

export const requireInstallToken = (req: Request, _res: Response, next: NextFunction) => {
    const clientToken = req.get(clientTokenName);
    const serverToken = process.env.Auto_Admin__INSTALL_TOKEN;

    if (!serverToken || serverToken.length < 32) {
        return next(unauthorized(ERROR_CODES.INSTALL_INVALID_SETUP_TOKEN));
    }

    if (!clientToken) {
        return next(unauthorized(ERROR_CODES.INSTALL_INVALID_SETUP_TOKEN));
    }

    const clientTokenHash = crypto.createHash('sha256').update(clientToken).digest();
    const serverTokenHash = crypto.createHash('sha256').update(serverToken).digest();

    if (!crypto.timingSafeEqual(clientTokenHash, serverTokenHash)) {
        return next(unauthorized(ERROR_CODES.INSTALL_INVALID_SETUP_TOKEN));
    }

    return next();
};