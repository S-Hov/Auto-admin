import { ApiError } from "../../../shared/api/errors/ApiError";
import { ERROR_CODES } from "../../../shared/api/codes/error-codes";

export const MAX_QUERY_RESULT_BYTES = 2 * 1024 * 1024;

export function assertQueryResultSize(value: unknown): void {
    if (
        Buffer.byteLength(JSON.stringify(value), "utf8") >
        MAX_QUERY_RESULT_BYTES
    ) {
        throw new ApiError({
            status: 413,
            code: ERROR_CODES.QUERY_RESULT_TOO_LARGE,
        });
    }
}
