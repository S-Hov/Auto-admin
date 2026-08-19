import type { NextFunction, Request, Response } from "express";
import { unauthorized } from "../api/errors/error-helpers";
import crypto from 'crypto';

const clientTokenName = 'x-auto-admin-install-token';

export const requireInstallToken = (req: Request, _res: Response, next: NextFunction) => {
    const clientToken = req.get(clientTokenName);
    const serverToken = process.env.Auto_Admin__INSTALL_TOKEN;

    if (!serverToken || serverToken.length < 32) {
        return next('Server install token is not configured or too short');
    }

    if (!clientToken) {
        return next(unauthorized('Неверный или отсутствующий токен установки', undefined, 'INSTALL.INVALID_SETUP_TOKEN'));
    }

    const clientTokenHash = crypto.createHash('sha256').update(clientToken).digest();
    const serverTokenHash = crypto.createHash('sha256').update(serverToken).digest();

    if (!crypto.timingSafeEqual(clientTokenHash, serverTokenHash)) {
        return next(unauthorized('Неверный или отсутствующий токен установки', undefined, 'INSTALL.INVALID_SETUP_TOKEN'));
    }

    return next();
};