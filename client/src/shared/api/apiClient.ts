import { ApiClientError } from "./ApiClientError";
import type { ApiErrorPayload, ApiSuccessPayload, TranslationParams } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isTranslationParams = (value: unknown): value is TranslationParams => (
    isRecord(value)
    && Object.values(value).every((item) => (
        typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
    ))
);

export const isApiErrorPayload = (value: unknown): value is ApiErrorPayload => {
    if (!isRecord(value) || value.success !== false || typeof value.code !== 'string' || value.code.length === 0) {
        return false;
    }

    return value.params === undefined || isTranslationParams(value.params);
};

export const isApiSuccessPayload = (value: unknown): value is ApiSuccessPayload => (
    isRecord(value)
    && value.success === true
    && typeof value.code === 'string'
    && value.code.length > 0
);

export class ApiContractError extends Error {
    readonly status: number;

    constructor(status: number) {
        super('The server returned an invalid API response');
        this.name = 'ApiContractError';
        this.status = status;
    }
}

export const getBaseUrl = (): string => {
    const viteApiUrl: string | undefined = import.meta.env.VITE_API_URL;
    if (viteApiUrl) {
        return viteApiUrl;
    }

    if (typeof window !== 'undefined' && window.location.hostname) {
        return `http://${window.location.hostname}:5180`;
    }

    return 'http://127.0.0.1:5180';
}

export async function apiClient<TData = unknown>(url: string, options?: RequestInit): Promise<ApiSuccessPayload<TData>> {
    const headers = new Headers(options?.headers as HeadersInit);
    const isFormDataBody: boolean = typeof FormData !== 'undefined' && options?.body instanceof FormData;

    if (!isFormDataBody && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(getBaseUrl() + '/api' + url, {
        credentials: 'include',
        ...options,
        headers
    });

    const text = await response.text();

    let data: unknown;

    try {
        data = JSON.parse(text);
    } catch {
        data = text;
    }

    if (isApiErrorPayload(data)) {
        throw new ApiClientError(data, response.status);
    }

    if (!response.ok) {
        throw new ApiClientError({ success: false, code: 'COMMON.UNKNOWN_ERROR' }, response.status);
    }

    if (!isApiSuccessPayload(data)) {
        throw new ApiContractError(response.status);
    }

    return data as ApiSuccessPayload<TData>;
}
