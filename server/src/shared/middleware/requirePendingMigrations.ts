import type { NextFunction, Request, Response } from "express";
import { getCurrentMigrationPlan } from "../../migrations/migration.runner";

export const requirePendingMigrations = async (_req: Request, _res: Response, next: NextFunction) => {
    try {
        const plan = await getCurrentMigrationPlan();

        if (!plan.isComplete) return next();

        return next(new Error('Миграции уже установлены'));
    }
    catch (error) {
        return next(error);
    }
}
