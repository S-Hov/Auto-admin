import { ApiClientError } from "./ApiClientError";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { apiMessage } from "../i18n/api-message";
import type { TranslationParams } from "./types";

interface FieldErrorPayload {
    field: string;
    code: string;
    params?: TranslationParams;
}

const isFieldErrorPayload = (value: unknown): value is FieldErrorPayload => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

    const candidate = value as Record<string, unknown>;
    if (typeof candidate.field !== 'string' || typeof candidate.code !== 'string') return false;
    if (candidate.params === undefined) return true;
    if (typeof candidate.params !== 'object' || candidate.params === null || Array.isArray(candidate.params)) return false;

    return Object.values(candidate.params).every((item) => (
        typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
    ));
};

export const applyFieldErrors = <TFieldValues extends FieldValues>(
    error: unknown,
    setError: UseFormSetError<TFieldValues>,
    allowedFields?: (keyof TFieldValues)[]
): boolean => {
    let hasDetails = false;

    if (error instanceof ApiClientError) {
        if (
            Array.isArray(error.details)
            && error.details.every(isFieldErrorPayload)
        ) {
            for (const field of error.details) {
                if (allowedFields && !allowedFields.includes(field.field)) continue;
                hasDetails = true;
                const message = apiMessage({ code: field.code, params: field.params });
                setError(field.field as Path<TFieldValues>, { type: 'server', message });
            }
        }
    }

    return hasDetails;
}
