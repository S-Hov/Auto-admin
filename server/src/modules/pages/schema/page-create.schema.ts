import z from "zod";
import { pageConfigSchema } from "./page-config.schema";

export const createPageSchema = z.strictObject({
    name: z.string().trim().min(1).max(100),
    description: z.string().nullable(),
    config: pageConfigSchema,
})

export type CreatePageData = z.infer<typeof createPageSchema>