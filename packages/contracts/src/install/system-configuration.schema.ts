import { z } from 'zod';
import { DATABASE_TYPES } from '../database';
import { apiResponseSchema } from '../common';
export const systemConfigurationOptionsSchema = z.strictObject({ supportedDatabases: z.array(z.enum(DATABASE_TYPES)) });
export const systemConfigurationOptionsResponseSchema = apiResponseSchema(systemConfigurationOptionsSchema);
export type SystemConfigurationOptionsResponse = z.infer<typeof systemConfigurationOptionsSchema>;
