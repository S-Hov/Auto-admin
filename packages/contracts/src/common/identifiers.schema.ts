import { z } from 'zod';
export const positiveIdSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export type TranslationParams = z.infer<typeof import('./api-response.schema').translationParamsSchema>;
export type FieldValidationError = z.infer<typeof import('./api-response.schema').fieldErrorSchema>;
