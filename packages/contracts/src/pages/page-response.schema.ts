import { z } from "zod";
import { pageConfigSchema } from "./page-config.schema";
import { apiResponseSchema } from "../common";

export const pageDataSchema = z.looseObject({
    pageId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    name: z.string().min(1).max(100),
    description: z.string().nullable(),
    config: pageConfigSchema,
    revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
})

export const pageResponseSchema = apiResponseSchema(pageDataSchema);
export type PageData = z.infer<typeof pageDataSchema>;
