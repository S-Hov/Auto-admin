import type { NextFunction, Request, Response } from "express";
import { readBootstrapStatus } from "../../modules/bootstrap";
import { conflict } from "../api/errors/error-helpers";

export const canConfigureDatabase = async (_req: Request, _res: Response, next: NextFunction) => {
    try {
        const status = await readBootstrapStatus();
    
        if (status === 'database_required') return next();

        return next(conflict('Конфигурация базы данных не требуется или база временно недоступна'));
    }
    catch (err) {
        next(err);
    }
}