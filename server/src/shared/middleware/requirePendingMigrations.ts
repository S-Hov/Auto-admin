import type { NextFunction, Request, Response } from "express";
import { getCurrentMigrationPlan } from "../../migrations/migration.runner";
import { conflict } from "../api/errors/error-helpers";

export const requirePendingMigrations = async (_req: Request, _res: Response, next: NextFunction) => {
    const plan = await getCurrentMigrationPlan();
    if (!plan.isComplete) next();
    else next(conflict('Миграции уже установлены', undefined, 'INSTALL.MIGRATIONS_ALREADY_COMPLETED'));
}
