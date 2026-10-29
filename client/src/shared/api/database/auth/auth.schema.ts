import { apiResponseSchema } from '@auto-admin/contracts/common';
import { z } from 'zod';

// Registration always returns redirectedTo in the current server contract.
export const createAdminSchema = z.looseObject({ redirectedTo: z.string() });
export const createAdminResponseSchema = apiResponseSchema(createAdminSchema);
