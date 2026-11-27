import { apiResponseSchema } from '../common';
import { z } from 'zod';

export const manageableMenuItemDtoSchema = z.looseObject({
    id: z.number().int(),
    parentId: z.number().int().nullable(),
    // Старые ответы могут не содержать привязку; при наличии она валидируется.
    pageId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).nullable().optional(),
    name: z.string(),
    slug: z.string(),
    icon: z.string().nullable(),
    iconType: z.enum(['icon', 'svg', 'image', 'video']),
    sortOrder: z.number().int(),
    isActive: z.boolean(),
});

export const visibleMenuItemDtoSchema = manageableMenuItemDtoSchema.extend({
    canView: z.boolean(),
    canCreate: z.boolean(),
    canUpdate: z.boolean(),
    canDelete: z.boolean(),
});

export const visibleMenuResponseSchema = apiResponseSchema(z.array(visibleMenuItemDtoSchema));
export const manageableMenuResponseSchema = apiResponseSchema(z.array(manageableMenuItemDtoSchema));

export { menuSaveSchema as menuSaveDataSchema } from './menu-request.schema';
export const menuSaveResponseSchema = apiResponseSchema(z.strictObject({
    id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
}));

export const menuDeleteIdSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const menuDeleteResponseSchema = apiResponseSchema(z.strictObject({ deleted: z.literal(true) }));
export type ManageableMenuItemDto = z.infer<typeof manageableMenuItemDtoSchema>;
export type VisibleMenuItemDto = z.infer<typeof visibleMenuItemDtoSchema>;
