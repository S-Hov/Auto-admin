import type { z } from 'zod';
import type { menuItemSchema } from './menu.schema';

export type MenuItemDto = z.infer<typeof menuItemSchema>;
