import type { ApiErrorPayload } from "./types";

export class ApiClientError extends Error {
    readonly status: number;
    readonly code: string;
    readonly params: Record<string, string | number | boolean> | undefined;
    readonly details: unknown;

    constructor(options: ApiErrorPayload, status: number) {
        super(options.code);
        this.name = 'ApiClientError';
        this.status = status;
        this.code = options.code;
        this.params = options.params;
        this.details = options.details;
    }
}