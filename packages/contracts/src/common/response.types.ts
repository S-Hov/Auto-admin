import { ErrorCode } from "./error-codes";
import { SuccessCode } from "./success-codes";
import { TranslationParams } from "./identifiers.schema";

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
