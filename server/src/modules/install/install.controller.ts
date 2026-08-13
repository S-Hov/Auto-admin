import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import {
    ApplyMigrationsStepService,
    applyNextMigrationService,
    checkConnectionService,
    getMigrationPlanService,
    getMigrationsStepsService
} from './install.service';
import type {
    DbCheckResponse,
    MigrationsStepsResponse,
    ApplyMigrationsStepResponse,
    MigrationPlanResponse,
    ApplyNextMigrationResponse
} from './install.types';
import { ok } from '../../shared/api/success';
import { badRequest } from '../../shared/api/errors/error-helpers';
import type { DbConnectionData } from '../../db/checkConnection';
import type { ApplyNextMigrationData } from './schema/applyNextMigration.schema';

export const checkConnectionController = asyncHandler(async (req: Request, res: Response) => {
    const { host, port, database, user, password }: DbConnectionData = req.body;
    const data = await checkConnectionService({ host, port, database, user, password });
    console.log('data :', data);

    return ok<DbCheckResponse>(res, 'Соединение с базой данных установлено. Файл конфигурации создан', data);
})

export const getMigrationsSteps = asyncHandler(async (_req: Request, res: Response) => {
    const data = await getMigrationsStepsService();

    return ok<MigrationsStepsResponse>(res, 'Шаги миграции получены', data);
})

export const ApplyMigrationsStep = asyncHandler(async (req: Request, res: Response) => {
    const stepParam: string | string[] | undefined = req.params.step;
    const step = Array.isArray(stepParam) ? stepParam[0] : stepParam;

    if (!step) {
        throw badRequest('Некорректный шаг миграции');
    }

    const data = await ApplyMigrationsStepService(step);

    return ok<ApplyMigrationsStepResponse>(res, 'Шаг миграции выполнен', data);
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