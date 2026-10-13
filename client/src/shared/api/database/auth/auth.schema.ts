import { z } from 'zod';
import { apiResponseSchema } from '../../schema';

// Registration always returns redirectedTo in the current server contract.
export const createAdminSchema = z.looseObject({ redirectedTo: z.string() });
export const createAdminResponseSchema = apiResponseSchema(createAdminSchema);
