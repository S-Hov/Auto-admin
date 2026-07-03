import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { checkConnectionService } from './install.service';
import { type DbConnectionData } from './install.types';
import { ok } from '../../shared/api/success';

export const checkConnectionController = asyncHandler(async (req: Request, res: Response) => {
    const { host, port, database, user, password }: DbConnectionData = req.body;
    const data = await checkConnectionService({ host, port, database, user, password });

    return ok(res, 'Соединение с базой данных успешно установлено', data);
})