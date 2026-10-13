import type { z } from 'zod';
import { apiErrorSchema, apiSuccessSchema } from './schema';
import { ApiClientError } from "./ApiClientError";
import type { ApiErrorPayload, ApiSuccessPayload } from "./types";

export const isApiErrorPayload = (value: unknown): value is ApiErrorPayload => apiErrorSchema.safeParse(value).success;

export const isApiSuccessPayload = (value: unknown): value is ApiSuccessPayload => apiSuccessSchema.safeParse(value).success;

export function parseApiResponse<T>(data: unknown, schema: z.ZodType<T>, status: number): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        throw new ApiContractError(status, result.error);
    }
    return result.data;
}

export class ApiContractError extends Error {
    readonly status: number;

    constructor(status: number, cause?: unknown) {
        super('The server returned an invalid API response', { cause });
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

/** Each endpoint supplies its complete server response schema. */
export async function apiClient<T>(url: string, schema: z.ZodType<T>, options?: RequestInit): Promise<T> {
    const headers = new Headers(options?.headers);
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

    return parseApiResponse(data, schema, response.status);
}
