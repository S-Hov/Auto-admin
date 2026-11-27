import type { Response } from 'express';
import { type ErrorCode, type TranslationParams, type ApiErrorResponse, type ApiSuccessResponse, SuccessCode } from "@auto-admin/contracts/common";

export const successResponse = <TData = unknown>(res: Response, status: number, code: SuccessCode, data?: TData) => {
    const body: ApiSuccessResponse<TData> = {
        success: true,
        code,
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
