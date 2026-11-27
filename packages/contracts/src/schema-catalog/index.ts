import { z } from 'zod';
import { apiResponseSchema, positiveIdSchema } from '../common';

export const catalogDisplayTypeSchema = z.enum(['text', 'number', 'date', 'datetime', 'boolean', 'image', 'link']);
export const catalogFieldSchema = z.strictObject({
    id: positiveIdSchema,
    name: z.string(),
    dataType: z.string(),
    nullable: z.boolean(),
    allowedDisplays: z.array(catalogDisplayTypeSchema),
});
export const catalogResourceSchema = z.strictObject({
    id: positiveIdSchema,
    schemaName: z.string(),
    tableName: z.string(),
    type: z.enum(['table', 'view']),
    comment: z.string().nullable(),
    isSystem: z.boolean(),
    fields: z.array(catalogFieldSchema),
    recordKeys: z.array(z.strictObject({ name: z.string(), fieldIds: z.array(positiveIdSchema).min(1) })),
});
export const catalogResponseSchema = apiResponseSchema(z.strictObject({
    fingerprint: z.string(),
    resources: z.array(catalogResourceSchema),
}));
export type CatalogResource = z.infer<typeof catalogResourceSchema>;
export type CatalogField = z.infer<typeof catalogFieldSchema>;
export type CatalogDisplayType = z.infer<typeof catalogDisplayTypeSchema>;
