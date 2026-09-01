import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import {
    applyNextMigrationService,
    checkConnectionService,
    getMigrationPlanService,
} from './install.service';
import type {
    DbCheckResponse,
    MigrationPlanResponse,
    ApplyNextMigrationResponse
} from './install.types';
import { ok } from '../../shared/api/success';
import type { DbConnectionData } from '../../db/checkConnection';
import type { ApplyNextMigrationData } from './schema/applyNextMigration.schema';
import { SUCCESS_CODES } from '../../shared/api/codes/success-codes';

export const checkConnectionController = asyncHandler(async (req: Request, res: Response) => {
    const { host, port, database, user, password }: DbConnectionData = req.body;
    const data = await checkConnectionService({ host, port, database, user, password });

    return ok<DbCheckResponse>(res, SUCCESS_CODES.INSTALL_DATABASE_CONNECTED, data);
})

export const getMigrationPlanController = asyncHandler(async (_req: Request, res: Response) => {
    const data = await getMigrationPlanService();
    return ok<MigrationPlanResponse>(res, SUCCESS_CODES.INSTALL_MIGRATION_PLAN_RECEIVED, data);
})

export const applyNextMigrationController = asyncHandler(async (req: Request, res: Response) => {
    const {
        expectedVersion
    }: ApplyNextMigrationData = req.body;

    const result = await applyNextMigrationService(expectedVersion);

    return ok<ApplyNextMigrationResponse>(
        res,
        SUCCESS_CODES.INSTALL_MIGRATION_APPLIED,
        result
    );
})