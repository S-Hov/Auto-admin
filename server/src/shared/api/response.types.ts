import { ErrorCode } from "./codes/error-codes";
import { TranslationParams } from "./errors/ApiError";

export interface ApiSuccessResponse<TData = null> {
    success: true;
    message: string;
    status: number;
    data?: TData;
}

export interface ApiErrorResponse<TDetails = unknown> {
    success: false;
    code: ErrorCode;
    params?: TranslationParams;
    details?: TDetails;
}