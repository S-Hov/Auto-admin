export class ApiError<TData = unknown> extends Error {
    public readonly status: number;
    public readonly data?: TData;
    public readonly code?: string;

    constructor(
        message: string,
        status = 500,
        code?: string,
        data?: TData,
        success: boolean = false,
    ) {
        super(message);

        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.data = data;
    }
}