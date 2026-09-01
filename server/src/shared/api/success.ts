import type { Response } from 'express';
import { successResponse } from './response';
import { SUCCESS_CODES, type SuccessCode } from './codes/success-codes';

export const ok = <TData>(
    res: Response,
    code: SuccessCode = SUCCESS_CODES.COMMON_OK,
    data?: TData
) => {
    return successResponse(res, 200, code, data);
};

export const created = <TData>(
    res: Response,
    code: SuccessCode = SUCCESS_CODES.COMMON_CREATED,
    data?: TData
) => {
    return successResponse(res, 201, code, data);
};

export const noContent = (
    res: Response,
    code: SuccessCode = SUCCESS_CODES.COMMON_NO_CONTENT,
) => {
    return successResponse(res, 204, code);
};