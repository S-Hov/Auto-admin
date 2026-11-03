import z from "zod";
import { createPageSchema } from "./page-create.schema";

export const updatePageSchema = createPageSchema.extend({
    revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});

export type UpdatePageData = z.infer<typeof updatePageSchema>;
