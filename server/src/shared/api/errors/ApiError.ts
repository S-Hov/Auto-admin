import type { ErrorCode } from '../codes/error-codes';

export type TranslationParams = Record<string, string | number | boolean>;

export interface ApiErrorOptions<TDetails = unknown> {
    status: number;
    code: ErrorCode;
    params?: TranslationParams;
    details?: TDetails;
    internalMessage?: string;
    cause?: unknown;
}

export class ApiError<TDetails = unknown> extends Error {
    public readonly status: number;
    public readonly code: ErrorCode;
    public readonly params?: TranslationParams;
    public readonly details?: TDetails;

    constructor(options: ApiErrorOptions<TDetails>) {
        super(options.internalMessage || options.code);
        this.name = 'ApiError';
        this.status = options.status;
        this.code = options.code;
        this.params = options.params;
        this.details = options.details;
        this.cause = options.cause;

        Object.setPrototypeOf(this, new.target.prototype);
    }
}