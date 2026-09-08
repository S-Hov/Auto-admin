import type { NextFunction, Request, Response } from 'express';
import { MigrationRecoveryRequiredError } from '../../migrations/migration.errors';
import { getCurrentMigrationPlan } from '../../migrations/migration.runner';
import { ERROR_CODES } from '../api/codes/error-codes';
import { conflict } from '../api/errors/error-helpers';

export const requireMigrationRecovery = async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
        await getCurrentMigrationPlan();
        next(conflict(ERROR_CODES.INSTALL_MIGRATION_RECOVERY_NOT_REQUIRED));
    }
    catch (error) {
        if (error instanceof MigrationRecoveryRequiredError) {
            next();
            return;
        }
        next(error);
    }
};
