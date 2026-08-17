import type { NextFunction, Request, Response } from "express";
import { readBootstrapStatus } from "../../modules/bootstrap";
import { conflict } from "../api/errors/error-helpers";

export const canConfigureDatabase = async (_req: Request, _res: Response, next: NextFunction) => {
    try {
        const status = await readBootstrapStatus();
    
        if (status === 'database_required' || status === 'database_unavailable') return next();

        next(conflict('Конфигурация базы данных не требуется'));
    }
    catch (err) {
        next(err);
    }
}