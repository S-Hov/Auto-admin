import { z } from 'zod';
import { apiResponseSchema } from '../schema';

export const manageableMenuItemDtoSchema = z.looseObject({
    id: z.number().int(),
    parentId: z.number().int().nullable(),
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

export const menuSaveDataSchema = z.strictObject({
    id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
    parentId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).nullable(),
    name: z.string().trim().min(1).max(100),
    slug: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,149}$/),
    icon: z.string().max(255).nullable(),
    iconType: z.enum(['icon', 'svg', 'image', 'video']),
    sortOrder: z.number().int().min(-1_000_000).max(1_000_000),
    isActive: z.boolean(),
});
export const menuSaveResponseSchema = apiResponseSchema(z.strictObject({
    id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
}));
