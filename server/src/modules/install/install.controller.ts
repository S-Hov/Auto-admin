import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import {
    ApplyMigrationsStepService,
    checkConnectionService,
    getMigrationsStepsService
} from './install.service';
import type { 
    DbCheckResponse, 
    MigrationsStepsResponse, 
    DbConnectionData, 
    ApplyMigrationsStepResponse 
} from './install.types';
import { ok } from '../../shared/api/success';
import { badRequest } from '../../shared/api/errors/error-helpers';

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

    return ok<ApplyMigrationsStepResponse>(res, 'Шаги миграции получены', data);
})

const a = 'Иван'