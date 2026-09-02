import { ZodIssue } from "zod/v3";
import { FieldValidationError } from "./validation.types";
import { ERROR_CODES } from "../codes/error-codes";

export const mapZodIssue = (issue: ZodIssue): FieldValidationError => {
    const field = issue.path.join('.');

    switch (issue.code) {
        case 'invalid_type':
            if (issue.received === 'undefined') {
                return { field, code: ERROR_CODES.VALIDATION_REQUIRED };
            }
            break;

        case 'too_small':
            if (issue.type === 'string') {
                return { field, code: ERROR_CODES.VALIDATION_STRING_TOO_SHORT, params: { min: Number(issue.minimum) } };
            }
            else if (issue.type === 'number') {
                return { field, code: ERROR_CODES.VALIDATION_NUMBER_TOO_SMALL, params: { min: Number(issue.minimum) } };
            }
            break;

        case 'too_big':
            if (issue.type === 'string') {
                return { field, code: ERROR_CODES.VALIDATION_STRING_TOO_LONG, params: { max: Number(issue.maximum) } };
            }
            else if (issue.type === 'number') {
                return { field, code: ERROR_CODES.VALIDATION_NUMBER_TOO_LARGE, params: { max: Number(issue.maximum) } };
            }
            break;

        case 'custom':
            return { field, code: ERROR_CODES.VALIDATION_PASSWORDS_DO_NOT_MATCH };

        default:
            return { field, code: ERROR_CODES.VALIDATION_INVALID_VALUE };
    }

    return { field, code: ERROR_CODES.VALIDATION_INVALID_VALUE };
};