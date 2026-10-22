import type { z } from 'zod';
import type { manageableMenuItemDtoSchema, visibleMenuItemDtoSchema, menuSaveDataSchema } from './menu.schema';

export type ManageableMenuItemDto = z.infer<typeof manageableMenuItemDtoSchema>;
export type VisibleMenuItemDto = z.infer<typeof visibleMenuItemDtoSchema>;
export type MenuSaveData = z.infer<typeof menuSaveDataSchema>;
