import { z } from 'zod';
import { positiveIdSchema } from '../common';
import { pageDataSchema, pageResponseSchema, type PageData } from '../pages';

export const menuSlugSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,149}$/);
export const menuResolveParamsSchema = z.strictObject({ slug: menuSlugSchema });
export const menuResolveIdParamsSchema = z.strictObject({
    id: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(positiveIdSchema),
});
// Both menu lookups return the same page document as the pages API.
export const menuResolveResultSchema = pageDataSchema;
export const menuResolveResponseSchema = pageResponseSchema;

export type MenuResolveParams = z.infer<typeof menuResolveParamsSchema>;
export type MenuResolveIdParams = z.infer<typeof menuResolveIdParamsSchema>;
export type MenuResolveResult = PageData;
