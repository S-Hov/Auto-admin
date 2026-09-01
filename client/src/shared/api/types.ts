export type TranslationParams = Record<string, string | number | boolean>;

export interface ApiErrorPayload {
    success: false;
    code: string;
    params?: TranslationParams;
    details?: unknown;
}

export interface UnifiedResponse<TData = unknown> {
    success: boolean;
    code: string;
    data?: TData;
    params?: TranslationParams;
    details?: unknown;
}