import { z } from 'zod';
import { apiResponseSchema, positiveIdSchema } from '../common';
const count = z.number().int().min(0);
export const schemaScanCountsSchema = z.strictObject({
    addedResources: count, changedResources: count, missingResources: count,
    addedFields: count, changedFields: count, missingFields: count,
});
export const schemaScanResultSchema = z.strictObject({
    scanId: positiveIdSchema, fingerprint: z.string(), counts: schemaScanCountsSchema,
});
export const schemaScanResponseSchema = apiResponseSchema(schemaScanResultSchema);
export type SchemaScanChangeCounts = z.infer<typeof schemaScanCountsSchema>;
