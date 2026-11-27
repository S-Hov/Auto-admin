import { z } from 'zod';

export const menuSlugSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,149}$/);
