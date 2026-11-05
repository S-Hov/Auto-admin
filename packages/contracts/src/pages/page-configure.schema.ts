import { z } from 'zod';
import { positiveIdSchema } from '../common';
import { createPageSchema } from './page-create.schema';

// A menu destination is configured atomically; existing bindings are not overwritten.
export const configureMenuPageSchema = z.discriminatedUnion('mode', [
    z.strictObject({ mode: z.literal('create'), page: createPageSchema }),
    z.strictObject({ mode: z.literal('existing'), pageId: positiveIdSchema }),
]);
export type ConfigureMenuPageData = z.infer<typeof configureMenuPageSchema>;
