import type { Response } from 'express';
import type { ErrorCode } from './codes/error-codes';
import type { TranslationParams } from './errors/ApiError';

export const successResponse = (res: Response, status: number, message: string, data?: any) => {
    return res.status(status).json({
        success: true,
        message,
        status,
        data
    });
};

export const errorResponse = <TDetails = unknown>(
    res: Response,
    status: number,
    code: ErrorCode,
    params?: TranslationParams,
    details?: TDetails
) => {
    return res.status(status).json({
        success: false,
        code,
        params,
        details
    });
};