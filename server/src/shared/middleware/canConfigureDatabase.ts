import type { NextFunction, Request, Response } from "express";
import { readBootstrapStatus } from "../../modules/bootstrap";
import { conflict } from "../api/errors/error-helpers";
import { ERROR_CODES } from "../api/codes/error-codes";

export const canConfigureDatabase = async (_req: Request, _res: Response, next: NextFunction) => {
    try {
        const status = await readBootstrapStatus();
    
        if (status === 'database_required') return next();

        return next(conflict(ERROR_CODES.INSTALL_DATABASE_CONFIGURATION_NOT_ALLOWED));
    }
    catch (err) {
        next(err);
    }
}