import { z } from "zod";

export const PAGE_LIST_LIMITS = { defaultLimit: 25, maxLimit: 100, maxOffset: 100_000 } as const;

export const pageListSchema = z.strictObject({
    q: z.string().trim().max(100).default(""),
    limit: z.string().regex(/^[1-9]\d*$/).default(String(PAGE_LIST_LIMITS.defaultLimit))
        .transform(Number).pipe(z.number().int().min(1).max(PAGE_LIST_LIMITS.maxLimit)),
    offset: z.string().regex(/^(0|[1-9]\d*)$/).default("0")
        .transform(Number).pipe(z.number().int().min(0).max(PAGE_LIST_LIMITS.maxOffset)),
});

export type PageListQuery = z.infer<typeof pageListSchema>;
