import { z } from 'zod';
import { menuSlugSchema } from '../menu/menu-slug.schema';

export const pageResolveParamsSchema = z.strictObject({ slug: menuSlugSchema });
export type PageResolveParams = z.infer<typeof pageResolveParamsSchema>;
