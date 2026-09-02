import { ApiClientError } from "./ApiClientError";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { apiMessage } from "../i18n/api-message";

export const applyFieldErrors = <TFieldValues extends FieldValues>(
    error: unknown,
    setError: UseFormSetError<TFieldValues>,
    allowedFields?: (keyof TFieldValues)[]
): boolean => {
    let hasDetails = false;

    if (error instanceof ApiClientError) {
        if (
            Array.isArray(error.details)
            && error.details.every(field =>
                Object.prototype.hasOwnProperty.call(field, 'field')
                && Object.prototype.hasOwnProperty.call(field, 'code'))
        ) {
            for (const field of error.details) {
                if (allowedFields && allowedFields.includes(field.field)) continue;
                hasDetails = true;
                const message = apiMessage({ code: field.code, params: field.params });
                setError(field.field as Path<TFieldValues>, { type: 'server', message });
            }
        }
    }

    return hasDetails;
}