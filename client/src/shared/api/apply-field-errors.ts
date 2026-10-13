import { ApiClientError } from "./ApiClientError";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { apiMessage } from "../i18n/api-message";
import { z } from "zod";
import { fieldErrorSchema } from "./schema";

export const applyFieldErrors = <TFieldValues extends FieldValues>(
    error: unknown,
    setError: UseFormSetError<TFieldValues>,
    allowedFields?: (keyof TFieldValues)[]
): boolean => {
    let hasDetails = false;

    if (error instanceof ApiClientError) {
        const details = z.array(fieldErrorSchema).safeParse(error.details);
        if (details.success) {
            for (const field of details.data) {
                if (allowedFields && !allowedFields.includes(field.field)) continue;
                hasDetails = true;
                const message = apiMessage({ code: field.code, params: field.params });
                setError(field.field as Path<TFieldValues>, { type: 'server', message });
            }
        }
    }

    return hasDetails;
}
