import type { ErrorRequestHandler } from 'express';
import { ApiError } from '../api/errors/ApiError';
import { errorResponse } from '../api/response';
import { ERROR_CODES } from '../api/codes/error-codes';

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
    if (error instanceof ApiError) {
        return errorResponse(res, error.status, error.code, error.params, error.details);
    }

    if (error.status === 500) {
        console.log({
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            requestID: req.requestId,
            method: req.method,
            url: req.url,
            message: error.message || 'Непредвиденная ошибка',
            stack: error.stack,
        });
    }

    return errorResponse(res, 500, ERROR_CODES.COMMON_INTERNAL_ERROR);
};