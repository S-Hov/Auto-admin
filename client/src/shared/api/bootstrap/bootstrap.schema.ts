import { z } from 'zod';
import { apiResponseSchema } from '../schema';

export const bootstrapStageSchema = z.enum([
    'database_required', 'database_unavailable', 'migrations_required',
    'migration_recovery_required', 'admin_required', 'ready', 'system_error',
]);
export const bootstrapStatusSchema = z.looseObject({ stage: bootstrapStageSchema });
export const bootstrapResponseSchema = apiResponseSchema(bootstrapStatusSchema);
