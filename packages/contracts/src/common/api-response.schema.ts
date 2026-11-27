import { z } from 'zod';

export const translationParamsSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));

export const apiErrorSchema = z.looseObject({
    success: z.literal(false),
    code: z.string().min(1),
    params: translationParamsSchema.optional(),
    details: z.unknown().optional(),
});

export const apiSuccessSchema = z.looseObject({
    success: z.literal(true),
    code: z.string().min(1),
});

// Endpoints with a payload require data, even though the general envelope allows
// successes without data. looseObject preserves additional server fields.
export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) => apiSuccessSchema.extend({
    data: dataSchema,
});

export const fieldErrorSchema = z.looseObject({
    field: z.string(),
    code: z.string(),
    params: translationParamsSchema.optional(),
});
