import type { ErrorRequestHandler } from 'express';
import { ApiError } from '../api/errors/ApiError';
import { errorResponse } from '../api/response';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    console.log('errorHandler', error);
    if (error instanceof ApiError) {
        return errorResponse(res, error.status, error.message, {
            code: error.code,
            details: error.data,
        });
    }

    console.error(error);

    return errorResponse(res, 500, 'Внутренняя ошибка сервера');
};