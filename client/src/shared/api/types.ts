import type { z } from 'zod';
import type { apiErrorSchema, translationParamsSchema } from './schema';

export type TranslationParams = z.infer<typeof translationParamsSchema>;
export type ApiErrorPayload = z.infer<typeof apiErrorSchema>;

export interface ApiSuccessPayload<TData = unknown> {
    success: true;
    code: string;
    data?: TData;
}

// apiClient throws for every error envelope, therefore endpoint methods expose
// only the successful branch to their callers.
export type UnifiedResponse<TData = unknown> = ApiSuccessPayload<TData>;
