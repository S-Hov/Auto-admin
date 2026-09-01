import { ErrorCode } from "./codes/error-codes";
import { SuccessCode } from "./codes/success-codes";
import { TranslationParams } from "./errors/ApiError";

export interface ApiSuccessResponse<TData = null> {
    success: true;
    code: SuccessCode;
    data?: TData;
}

export interface ApiErrorResponse<TDetails = unknown> {
    success: false;
    code: ErrorCode;
    params?: TranslationParams;
    details?: TDetails;
}