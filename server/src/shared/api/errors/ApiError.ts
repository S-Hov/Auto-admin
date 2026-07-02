export class ApiError<TData = unknown> extends Error {
    public readonly status: number;
    public readonly data?: TData;
    public readonly code?: string;

    constructor(
        message: string,
        status = 500,
        data?: TData,
        code?: string
    ) {
        super(message);

        this.name = 'ApiError';
        this.status = status;
        this.data = data;
        this.code = code;
    }
}