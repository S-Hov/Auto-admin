import { PAGE_CONFIG_LIMITS } from "@auto-admin/contracts/pages";
import z from "zod";

export const PAGE_ROWS_QUERY_LIMITS = { maxOffset: 100_000 } as const;

export const pageRowsQuerySchema = z.strictObject({
    limit: z.number().int().min(1).max(PAGE_CONFIG_LIMITS.pageSize).optional(),
    offset: z.number().int().min(0).max(PAGE_ROWS_QUERY_LIMITS.maxOffset).default(0),
    sort: z.strictObject({
        field: z.string().min(1).max(64),
        direction: z.enum(['asc', 'desc']),
    }).optional(),
});

export type PageRowsQuery = z.infer<typeof pageRowsQuerySchema>;
