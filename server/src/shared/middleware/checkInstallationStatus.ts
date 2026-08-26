import type { NextFunction, Request, Response } from "express";
import { conflict } from "../api/errors/error-helpers";
import { readInstallationStatus } from '../../modules/install';
import { ERROR_CODES } from "../api/codes/error-codes";

export const statusNew = async (_req: Request, _res: Response, next: NextFunction) => {
    try {
        const installationStatus = await readInstallationStatus();
        if (installationStatus === 'new') return next();
        return next(conflict(ERROR_CODES.INSTALL_DATABASE_CONFIGURATION_NOT_ALLOWED));
    }
    catch {
        return next(conflict(ERROR_CODES.INSTALL_DATABASE_CONFIGURATION_NOT_ALLOWED));
    }
}

export const statusMigrated = async (_req: Request, _res: Response, next: NextFunction) => {
    try {
        const installationStatus = await readInstallationStatus();
        if (installationStatus === 'migrated') return next();
        return next(conflict(ERROR_CODES.INSTALL_DATABASE_CONFIGURATION_NOT_ALLOWED));
    }
    catch {
        return next(conflict(ERROR_CODES.INSTALL_DATABASE_CONFIGURATION_NOT_ALLOWED));
    }
}

export const statusReady = async (_req: Request, _res: Response, next: NextFunction) => {
    try {
        const installationStatus = await readInstallationStatus();
        if (installationStatus === 'ready') return next();
        return next(conflict(ERROR_CODES.INSTALL_DATABASE_CONFIGURATION_NOT_ALLOWED));
    }
    catch {
        return next(conflict(ERROR_CODES.INSTALL_DATABASE_CONFIGURATION_NOT_ALLOWED));
    }
}