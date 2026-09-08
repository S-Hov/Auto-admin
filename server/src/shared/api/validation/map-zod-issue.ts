import type { ZodIssue } from "zod";
import type { FieldValidationError } from "./validation.types";
import { ERROR_CODES } from "../codes/error-codes";

const hasPath = (input: unknown, path: PropertyKey[]): boolean => {
    let current = input;

    for (const segment of path) {
        if (typeof current !== 'object' || current === null || !Object.prototype.hasOwnProperty.call(current, segment)) {
            return false;
        }
        current = (current as Record<PropertyKey, unknown>)[segment];
    }

    return true;
};

export const mapZodIssue = (issue: ZodIssue, input?: unknown): FieldValidationError => {
    const field = issue.path.join('.');

    switch (issue.code) {
        case 'invalid_type':
            if (!hasPath(input, issue.path)) {
                return { field, code: ERROR_CODES.VALIDATION_REQUIRED };
            }
            return { field, code: ERROR_CODES.VALIDATION_INVALID_TYPE };

        case 'too_small':
            if (issue.origin === 'string') {
                return { field, code: ERROR_CODES.VALIDATION_STRING_TOO_SHORT, params: { min: Number(issue.minimum) } };
            }
            else if (issue.origin === 'number') {
                return { field, code: ERROR_CODES.VALIDATION_NUMBER_TOO_SMALL, params: { min: Number(issue.minimum) } };
            }
            break;

        case 'too_big':
            if (issue.origin === 'string') {
                return { field, code: ERROR_CODES.VALIDATION_STRING_TOO_LONG, params: { max: Number(issue.maximum) } };
            }
            else if (issue.origin === 'number') {
                return { field, code: ERROR_CODES.VALIDATION_NUMBER_TOO_LARGE, params: { max: Number(issue.maximum) } };
            }
            break;

        case 'custom':
            if (field === 'confirmPassword') {
                return { field, code: ERROR_CODES.VALIDATION_PASSWORDS_DO_NOT_MATCH };
            }
            return { field, code: ERROR_CODES.VALIDATION_INVALID_VALUE };

        default:
            return { field, code: ERROR_CODES.VALIDATION_INVALID_VALUE };
    }

    return { field, code: ERROR_CODES.VALIDATION_INVALID_VALUE };
};
