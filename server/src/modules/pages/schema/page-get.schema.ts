import z from "zod";
import { positiveIdSchema } from "../../../core/access-control/schema/permission.schema";

export const getPageSchema = z.strictObject({
    id: z
        .string()
        .regex(/^[1-9]\d*$/)
        .transform((val) => Number(val))
        .pipe(positiveIdSchema),
});

export type GetPageReqData = z.infer<typeof getPageSchema>;
