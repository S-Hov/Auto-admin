import type { NextFunction, Request, Response } from "express";
import { conflict } from "../api/errors/error-helpers";
import { readInstallationStatus } from '../../modules/install';

export const statusNew = async (_req: Request, _res: Response, next: NextFunction) => {
    try {
        const installationStatus = await readInstallationStatus();
        if (installationStatus === 'new') return next();
        return next(conflict());
    }
    catch {
        return next(conflict());
    }
}

export const statusMigrated = async (_req: Request, _res: Response, next: NextFunction) => {
    try {
        const installationStatus = await readInstallationStatus();
        if (installationStatus === 'migrated') return next();
        return next(conflict());
    }
    catch {
        return next(conflict());
    }
}

export const statusReady = async (_req: Request, _res: Response, next: NextFunction) => {
    try {
        const installationStatus = await readInstallationStatus();
        if (installationStatus === 'ready') return next();
        return next(conflict());
    }
    catch {
        return next(conflict());
    }
}