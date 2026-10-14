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
