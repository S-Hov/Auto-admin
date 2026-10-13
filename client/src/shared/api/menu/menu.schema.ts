import { z } from 'zod';

export const menuItemSchema = z.looseObject({
    id: z.number().int(),
    parentId: z.number().int().nullable(),
    name: z.string(),
    slug: z.string(),
    icon: z.string().nullable(),
    iconType: z.enum(['icon', 'svg', 'image', 'video']),
    sortOrder: z.number().int(),
    isActive: z.boolean(),
    canView: z.boolean(),
    canCreate: z.boolean(),
    canUpdate: z.boolean(),
    canDelete: z.boolean(),
});
export const menuResponseSchema = z.looseObject({
    success: z.literal(true),
    code: z.string().min(1),
    data: z.array(menuItemSchema),
});
