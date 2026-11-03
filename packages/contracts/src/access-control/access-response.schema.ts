import { z } from 'zod';
import { apiResponseSchema, positiveIdSchema } from '../common';
import { RESOURCE_PERMISSION_ACTIONS, FIELD_PERMISSION_ACTIONS, PERMISSION_EFFECTS } from './permission.constants';
export const accessibleCatalogSchema = z.strictObject({
 schemaName: z.string(), fingerprint: z.string(),
 resources: z.array(z.strictObject({
 id: positiveIdSchema, tableName: z.string(), type: z.enum(['table', 'view']), actions: z.array(z.enum(RESOURCE_PERMISSION_ACTIONS)),
 fields: z.array(z.strictObject({ id: positiveIdSchema, name: z.string(), dataType: z.string(), nullable: z.boolean(), actions: z.array(z.enum(FIELD_PERMISSION_ACTIONS)) })),
 })),
});
export const storedPermissionSchema = z.discriminatedUnion('targetType', [
 z.strictObject({ targetType: z.literal('resource'), targetId: positiveIdSchema, action: z.enum(RESOURCE_PERMISSION_ACTIONS), effect: z.enum(PERMISSION_EFFECTS) }),
 z.strictObject({ targetType: z.literal('field'), targetId: positiveIdSchema, action: z.enum(FIELD_PERMISSION_ACTIONS), effect: z.enum(PERMISSION_EFFECTS) }),
]);
export const accessibleCatalogResponseSchema = apiResponseSchema(accessibleCatalogSchema);
export const permissionsResponseSchema = apiResponseSchema(z.array(storedPermissionSchema));
export const permissionChangeResponseSchema = apiResponseSchema(z.strictObject({ changed: z.boolean() }));
export type AccessibleCatalog = z.infer<typeof accessibleCatalogSchema>;
export type StoredPermission = z.infer<typeof storedPermissionSchema>;
