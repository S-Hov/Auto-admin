import type { Response } from 'express';
import type { ErrorCode } from './codes/error-codes';
import type { TranslationParams } from './errors/ApiError';
import type { ApiErrorResponse, ApiSuccessResponse } from './response.types';

export const successResponse = (res: Response, status: number, message: string, data?: any) => {
    const body: ApiSuccessResponse<any> = {
        success: true,
        message,
        status,
        data
    };
    return res.status(status).json(body);
};

export const errorResponse = <TDetails = unknown>(
    res: Response,
    status: number,
    code: ErrorCode,
    params?: TranslationParams,
    details?: TDetails
) => {
    const body: ApiErrorResponse<TDetails> = {
        success: false,
        code,
        params,
        details
    };
    return res.status(status).json(body);
};