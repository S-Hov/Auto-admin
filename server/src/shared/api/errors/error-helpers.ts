import { ERROR_CODES, type ErrorCode } from '../codes/error-codes';
import { ApiError, type TranslationParams } from './ApiError';

interface HelperOptions<TDetails = unknown> {
    params?: TranslationParams;
    details?: TDetails;
    internalMessage?: string;
    cause?: unknown;
}

export const badRequest = (
    code: ErrorCode = ERROR_CODES.COMMON_BAD_REQUEST,
    options?: HelperOptions
) => new ApiError({ status: 400, code, ...options });

export const unauthorized = (
    code: ErrorCode = ERROR_CODES.COMMON_UNAUTHORIZED,
    options?: HelperOptions
) => new ApiError({ status: 401, code, ...options });

export const forbidden = (
    code: ErrorCode = ERROR_CODES.COMMON_FORBIDDEN,
    options?: HelperOptions
) => new ApiError({ status: 403, code, ...options });

export const notFound = (
    code: ErrorCode = ERROR_CODES.COMMON_NOT_FOUND,
    options?: HelperOptions
) => new ApiError({ status: 404, code, ...options });

export const conflict = (
    code: ErrorCode = ERROR_CODES.COMMON_CONFLICT,
    options?: HelperOptions
) => new ApiError({ status: 409, code, ...options });

export const tooManyRequests = (
    code: ErrorCode = ERROR_CODES.COMMON_TOO_MANY_REQUESTS,
    options?: HelperOptions
) => new ApiError({ status: 429, code, ...options });