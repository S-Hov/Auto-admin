import type { ErrorRequestHandler } from 'express';
import { ApiError } from '../api/errors/ApiError';
import { errorResponse } from '../api/response';
import { ERROR_CODES } from '../api/codes/error-codes';
import { logger } from '../logger';

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
    if (error instanceof ApiError) {
        if (error.status === 429 && error.params?.seconds) {
            res.setHeader('Retry-After', String(error.params.seconds));
        }
        return errorResponse(res, error.status, error.code, error.params, error.details);
    }

    logger.error({
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        err: error,
    }, error.message);

    return errorResponse(res, 500, ERROR_CODES.COMMON_INTERNAL_ERROR);
};