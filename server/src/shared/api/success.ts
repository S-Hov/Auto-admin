import type { Response } from 'express';
import { successResponse } from './response';

export const ok = <TData>(
    res: Response,
    message = 'Успешно',
    data?: TData
) => {
    return successResponse(res, 200, message, data);
};

export const created = <TData>(
    res: Response,
    message = 'Создано',
    data?: TData
) => {
    return successResponse(res, 201, message, data);
};

export const noContent = (
    res: Response,
    message = 'Нет данных'
) => {
    return successResponse(res, 204, message);
};