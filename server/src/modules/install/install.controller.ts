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

export const checkConnectionController = asyncHandler(async (req: Request, res: Response) => {
    const { host, port, database, user, password }: DbConnectionData = req.body;
    const data = await checkConnectionService({ host, port, database, user, password });

    return ok<DbCheckResponse>(res, 'Соединение с базой данных установлено. Файл конфигурации создан', data);
})

export const getMigrationPlanController = asyncHandler(async (_req: Request, res: Response) => {
    const data = await getMigrationPlanService();
    return ok<MigrationPlanResponse>(res, 'План миграции получен', data);
})

export const applyNextMigrationController = asyncHandler(async (req: Request, res: Response) => {
    const {
        expectedVersion
    }: ApplyNextMigrationData = req.body;

    const result = await applyNextMigrationService(expectedVersion);

    return ok<ApplyNextMigrationResponse>(
        res,
        "Миграция выполнена",
        result
    );
})