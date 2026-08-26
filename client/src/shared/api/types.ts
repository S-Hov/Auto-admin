export interface ApiError {
    message: string
    status: number
    code?: string
    data?: any
    success: false
}

export interface ApiErrorPayload {
    success: false;
    code: string;
    params?: Record<string, string | number | boolean>;
    details?: unknown;
}