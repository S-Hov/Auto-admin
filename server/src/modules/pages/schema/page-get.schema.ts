import z from "zod";

export const getPageSchema = z.strictObject({
    id: z.coerce.number().int().positive(),
})

export type GetPageReqData = z.infer<typeof getPageSchema>;