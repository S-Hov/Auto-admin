import { ERROR_CODES } from "../../shared/api/codes/error-codes";
import { badRequest } from "../../shared/api/errors/error-helpers";

export function invalidQuery(message: string, cause?: unknown) {
    return badRequest(ERROR_CODES.QUERY_INVALID, {
        internalMessage: message,
        cause,
    });
}

export function invalidQueryReference(message: string) {
    return badRequest(ERROR_CODES.QUERY_REFERENCE_INVALID, {
        internalMessage: message,
    });
}
