import { apiResponseSchema } from '@auto-admin/contracts/common';
import { z } from 'zod';

export const loginDataSchema = z.looseObject({ redirectedTo: z.string() });
export const logoutDataSchema = z.looseObject({ redirectedTo: z.string() });
export const authUserSchema = z.looseObject({
    userId: z.number().int(),
    username: z.string(),
    roleId: z.number().int(),
    roleKey: z.string(),
    rights: z.enum(['full', 'read_only', 'manager', 'none', 'custom']),
    expiresAt: z.iso.datetime({ offset: true }),
});

export const loginResponseSchema = apiResponseSchema(loginDataSchema);
export const logoutResponseSchema = apiResponseSchema(logoutDataSchema);
export const authUserResponseSchema = apiResponseSchema(authUserSchema);
