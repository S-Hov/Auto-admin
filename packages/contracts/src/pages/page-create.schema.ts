import { pageConfigSchema } from "./page-config.schema";
import z from "zod";

export const createPageSchema = z.strictObject({
    name: z.string().trim().min(1).max(100),
    description: z.string().nullable(),
    config: pageConfigSchema,
});

export type CreatePageData = z.infer<typeof createPageSchema>;
