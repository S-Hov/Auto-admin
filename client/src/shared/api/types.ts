export interface ApiError {
    message: string
    status: number
    code?: string
    data?: any
    success: false
}

export type TranslationParams = Record<string, string | number | boolean>;

export interface ApiErrorPayload {
    success: false;
    code: string;
    params?: TranslationParams;
    details?: unknown;
}

export interface UnifiedResponse<D = unknown> {
    success: true;
    message?: string;
    data?: D;
}