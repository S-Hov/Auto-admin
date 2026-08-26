import type { ErrorRequestHandler } from 'express';
import { ApiError } from '../api/errors/ApiError';
import { errorResponse } from '../api/response';
import { ERROR_CODES } from '../api/codes/error-codes';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ApiError) {
        return errorResponse(res, error.status, error.code, error.params, error.details);
    }

    console.error(error);

    return errorResponse(res, 500, ERROR_CODES.COMMON_INTERNAL_ERROR);
};