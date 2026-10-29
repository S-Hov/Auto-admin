import { apiResponseSchema } from '@auto-admin/contracts/common';
import { z } from 'zod';

export const bootstrapStageSchema = z.enum([
    'database_required', 'database_unavailable', 'migrations_required',
    'migration_recovery_required', 'admin_required', 'ready', 'system_error',
]);
export const bootstrapStatusSchema = z.looseObject({ stage: bootstrapStageSchema });
export const bootstrapResponseSchema = apiResponseSchema(bootstrapStatusSchema);
