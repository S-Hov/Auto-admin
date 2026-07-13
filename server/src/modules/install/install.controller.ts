import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import {
    ApplyMigrationsStepService,
    checkConnectionService,
    getMigrationsFirstStepService,
    getMigrationsStepsService
} from './install.service';
import { type DbConnectionData } from './install.types';
import { ok } from '../../shared/api/success';
import { badRequest } from '../../shared/api/errors/error-helpers';

export const checkConnectionController = asyncHandler(async (req: Request, res: Response) => {
    const { host, port, database, user, password }: DbConnectionData = req.body;
    const data = await checkConnectionService({ host, port, database, user, password });
    console.log('data :', data);

    return ok(res, 'Соединение с базой данных установлено. Файл конфигурации создан', data);
})

export const getMigrationsFirstStep = asyncHandler(async (_req: Request, res: Response) => {
    getMigrationsFirstStepService()

    return ok(res, 'Последний шаг миграции получен');
})

export const getMigrationsSteps = asyncHandler(async (_req: Request, res: Response) => {
    const data = await getMigrationsStepsService();

    return ok(res, 'Шаги миграции получены', data);
})

export const ApplyMigrationsStep = asyncHandler(async (req: Request, res: Response) => {
    const stepParam: string | string[] | undefined = req.params.step;
    const step = Array.isArray(stepParam) ? stepParam[0] : stepParam;

    if (!step) {
        throw badRequest('Некорректный шаг миграции');
    }

    const data = await ApplyMigrationsStepService(step);

    return ok(res, 'Шаги миграции получены', data);
})
