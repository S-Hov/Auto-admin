import type { z } from 'zod';
import type { createAdminSchema } from './auth.schema';

export type CreateAdmin = z.infer<typeof createAdminSchema>;
