import { z } from "zod";
import { apiResponseSchema, positiveIdSchema } from "../common";
import { PAGE_CONFIG_LIMITS } from "./page-config.schema";
import { PAGE_ROWS_QUERY_LIMITS } from "./page-rows-query.schema";

export const pageSaveResultSchema = z.strictObject({
    pageId: positiveIdSchema,
    revision: positiveIdSchema,
});

export const pageSaveResponseSchema = apiResponseSchema(pageSaveResultSchema);

export const pageDeleteResponseSchema = apiResponseSchema(
    z.strictObject({ deleted: z.literal(true) }),
);

export const pageListResultSchema = z.strictObject({
    items: z.array(
        z.strictObject({
            pageId: positiveIdSchema,
            name: z.string().min(1).max(100),
        }),
    ),
    pagination: z.strictObject({
        limit: z.number().int().min(1).max(100),
        offset: z.number().int().min(0).max(100_000),
        hasMore: z.boolean(),
    }),
});

export const pageListResponseSchema = apiResponseSchema(pageListResultSchema);

export const pageRowsResultSchema = z
    .strictObject({
        pageId: positiveIdSchema,
        revision: positiveIdSchema,
        rows: z
            .array(z.record(z.string(), z.unknown()))
            .max(PAGE_CONFIG_LIMITS.pageSize),
        pagination: z.strictObject({
            limit: z.number().int().min(1).max(PAGE_CONFIG_LIMITS.pageSize),
            offset: z
                .number()
                .int()
                .min(0)
                .max(PAGE_ROWS_QUERY_LIMITS.maxOffset),
            hasMore: z.boolean(),
        }),
    })
    .refine((data) => data.rows.length <= data.pagination.limit, {
        path: ["rows"],
        message: "Too many rows for the requested page",
    });

export const pageRowsResponseSchema = apiResponseSchema(pageRowsResultSchema);
export type PageRowsResult = z.infer<typeof pageRowsResultSchema>;
export type PageListResult = z.infer<typeof pageListResultSchema>;
export type PageListItem = PageListResult["items"][number];
export type PageUpdateResponse = z.infer<typeof pageSaveResultSchema>;
