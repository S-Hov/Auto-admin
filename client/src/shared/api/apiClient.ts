export interface UnifiedResponse<D> {
    success: boolean
    message: string
    status?: number
    data?: D
}

export interface ApiError {
    message: string
    status: number
    code?: string
    data?: any
    success: false
}

export const getBaseUrl = (): string => {
    const viteApiUrl: string | undefined = import.meta.env.VITE_API_URL
    if (viteApiUrl) {
        return viteApiUrl
    }

    if (typeof window !== 'undefined' && window.location.hostname) {
        return `http://${window.location.hostname}:8880`
    }

    return 'http://127.0.0.1:8880'
}

export async function apiClient<T>(url: string, options?: RequestInit): Promise<T> {
    const headers = new Headers(options?.headers as HeadersInit)
    const isFormDataBody: boolean = typeof FormData !== 'undefined' && options?.body instanceof FormData

    if (!isFormDataBody && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(getBaseUrl() + '/api' + url, {
        credentials: 'include',
        headers,
        ...options
    })

    const text = await response.text()

    let data: any

    try {
        data = JSON.parse(text)
    } catch {
        data = text
    }

    const isUnifiedApiResponse: boolean =
        data &&
        typeof data === 'object' &&
        Object.prototype.hasOwnProperty.call(data, 'success') &&
        Object.prototype.hasOwnProperty.call(data, 'message')

    if (isUnifiedApiResponse) {
        if (!response.ok || data.success === false) {
            const message = extractMessage(data, 'Не удалось выполнить запрос')

            throw {
                status: response.status,
                data,
                message,
                error: message,
                success: false
            } as ApiError
        }

        return data as T
    }

    if (!response.ok) {
        const message = extractMessage(data, 'Не удалось выполнить запрос')

        throw {
            status: response.status,
            data,
            message,
            error: message,
            success: false
        } as ApiError
    }

    return data as T
}

function extractMessage(payload: any, fallbackMessage: string): string {
    if (typeof payload === 'string' && payload.trim().length > 0) {
        return payload
    }

    if (payload && typeof payload === 'object') {
        if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
            return payload.message
        }

        if (typeof payload.error === 'string' && payload.error.trim().length > 0) {
            return payload.error
        }
    }

    return fallbackMessage
}

function unwrapUnifiedResponse(payload :UnifiedResponse<any>): any {
    const responseMeta = {
        success: payload.success,
        status: payload.status,
        message: payload.message
    }

    const hasData = Object.prototype.hasOwnProperty.call(payload, 'data')
    const responseData = hasData ? payload.data : null

    if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
        return {
            ...responseData,
            ...responseMeta
        }
    }

    if (responseData === null || responseData === undefined) {
        return responseMeta
    }

    return {
        ...responseMeta,
        data: responseData
    }
}
