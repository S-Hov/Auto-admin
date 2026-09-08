export type TranslationParams = Record<string, string | number | boolean>;

export interface ApiErrorPayload {
    success: false;
    code: string;
    params?: TranslationParams;
    details?: unknown;
}

export interface ApiSuccessPayload<TData = unknown> {
    success: true;
    code: string;
    data?: TData;
}

// apiClient throws for every error envelope, therefore endpoint methods expose
// only the successful branch to their callers.
export type UnifiedResponse<TData = unknown> = ApiSuccessPayload<TData>;
