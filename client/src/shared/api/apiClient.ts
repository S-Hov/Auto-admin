import { ApiClientError } from "./ApiClientError"
import type { ApiErrorPayload } from "./types"

export const getBaseUrl = (): string => {
    const viteApiUrl: string | undefined = import.meta.env.VITE_API_URL
    if (viteApiUrl) {
        return viteApiUrl
    }

    if (typeof window !== 'undefined' && window.location.hostname) {
        return `http://${window.location.hostname}:5180`
    }

    return 'http://127.0.0.1:5180'
}

export async function apiClient<T>(url: string, options?: RequestInit): Promise<T> {
    const headers = new Headers(options?.headers as HeadersInit)
    const isFormDataBody: boolean = typeof FormData !== 'undefined' && options?.body instanceof FormData

    if (!isFormDataBody && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(getBaseUrl() + '/api' + url, {
        credentials: 'include',
        ...options,
        headers
    })

    const text = await response.text()

    let data: any

    try {
        data = JSON.parse(text)
    } catch {
        data = text
    }

    // const isUnifiedApiResponse: boolean =
    //     data &&
    //     typeof data === 'object' &&
    //     Object.prototype.hasOwnProperty.call(data, 'success') &&
    //     Object.prototype.hasOwnProperty.call(data, 'message')

    // if (isUnifiedApiResponse) {
    //     if (!response.ok || data.success === false) {
    //         throw new ApiClientError(data, response.status)
    //     }

    //     return data as T
    // }

    if (!response.ok || (data && data.success === false)) {
        const errorPayload: ApiErrorPayload = {
            success: false,
            code: data?.code || 'COMMON.UNKNOWN_ERROR',
            params: data?.params,
            details: data?.details
        };

        throw new ApiClientError(errorPayload, response.status);
    }

    return data as T;
}

// function extractMessage(payload: any, fallbackMessage: string): string {
//     if (typeof payload === 'string' && payload.trim().length > 0) {
//         return payload
//     }

//     if (payload && typeof payload === 'object') {
//         if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
//             return payload.message
//         }

//         if (typeof payload.error === 'string' && payload.error.trim().length > 0) {
//             return payload.error
//         }
//     }

//     return fallbackMessage
// }