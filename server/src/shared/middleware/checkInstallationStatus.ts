import type { NextFunction, Request, Response } from "express";
import { getInstallationStatus } from "../../modules/install/install.repository";
import { conflict } from "../api/errors/error-helpers";

export const statusNew = async (_req: Request, _res: Response, next: NextFunction) => {
    try {
        const installationStatus = await getInstallationStatus()
        if (installationStatus?.status === 'new') return next()
        return next(conflict())
    }
    catch {
        return next(conflict())
    }
}

export const statusMigrated = async (_req: Request, _res: Response, next: NextFunction) => {
    try {
        const installationStatus = await getInstallationStatus()
        if (installationStatus?.status === 'migrated') return next()
        return next(conflict())
    }
    catch {
        return next(conflict())
    }
}

export const statusReady = async (_req: Request, _res: Response, next: NextFunction) => {
    try {
        const installationStatus = await getInstallationStatus()
        if (installationStatus?.status === 'ready') return next()
        return next(conflict())
    }
    catch {
        return next(conflict())
    }
}