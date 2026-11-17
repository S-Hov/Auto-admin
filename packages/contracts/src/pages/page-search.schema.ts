import z from "zod";

export const pageSearchFieldSchema = z.strictObject({
    fieldId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    mode: z.enum(['exact', 'contains', 'startsWith']),
})

export const pageSearchSchema = z.strictObject({
    fields: z.array(pageSearchFieldSchema).min(1).max(10),
}).superRefine((data, ctx) => {
    const fieldIds = new Set<number>();
    for (const field of data.fields) {
        if (fieldIds.has(field.fieldId)) {
            ctx.addIssue({
                code: 'custom',
                message: `Duplicate fieldId ${field.fieldId}`,
                path: ['fields', data.fields.indexOf(field)],
            });
        }
        fieldIds.add(field.fieldId);
    }
});

export type PageSearchField = z.infer<typeof pageSearchFieldSchema>;
export type PageSearch = z.infer<typeof pageSearchSchema>;