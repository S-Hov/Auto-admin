import { ApiClientError } from "./ApiClientError";
import type { ApiErrorPayload } from "./types";

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

export async function apiClient<T>(url: string, options?: RequestInit): Promise<T> {
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

    const errorObj = (typeof data === 'object' && data !== null) ? (data as Record<string, unknown>) : null;
    const isFailed = !response.ok || (errorObj && errorObj.success === false);

    if (isFailed) {
        const errorPayload: ApiErrorPayload = {
            success: false,
            code: typeof errorObj?.code === 'string' ? errorObj.code : 'COMMON.UNKNOWN_ERROR',
            params: errorObj?.params as ApiErrorPayload['params'],
            details: errorObj?.details
        };
        throw new ApiClientError(errorPayload, response.status);
    }

    return data as T;
}