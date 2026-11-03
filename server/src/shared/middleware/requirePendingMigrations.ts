import type { NextFunction, Request, Response } from "express";
import { getCurrentMigrationPlan } from "../../migrations/migration.runner";
import { conflict } from "../api/errors/error-helpers";
import { ERROR_CODES } from "@auto-admin/contracts/common";

export const requirePendingMigrations = async (_req: Request, _res: Response, next: NextFunction) => {
    try {
        const plan = await getCurrentMigrationPlan();

        if (!plan.isComplete) return next();

        return next(conflict(ERROR_CODES.INSTALL_MIGRATIONS_ALREADY_COMPLETED));
    }
    catch (error) {
        return next(error);
    }
}
