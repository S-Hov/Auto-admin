import { z } from 'zod';
import { apiResponseSchema } from '../../schema';

export const dbCheckSchema = z.looseObject({
    version: z.string().optional(),
    redirectedTo: z.string().optional(),
});
export const migrationStepSchema = z.looseObject({
    version: z.string(),
    name: z.string(),
    fileName: z.string(),
});
export const migrationPlanSchema = z.looseObject({
    pending: z.array(migrationStepSchema),
    nextVersion: z.string().nullable(),
    isComplete: z.boolean(),
});
export const applyNextMigrationSchema = z.looseObject({
    applied: migrationStepSchema.nullable(),
    nextVersion: z.string().nullable(),
    isComplete: z.boolean(),
});
export const recoveryMigrationSchema = z.looseObject({
    version: z.string(),
    name: z.string(),
    checksum: z.string(),
    status: z.enum(['running', 'failed']),
});

export const dbCheckResponseSchema = apiResponseSchema(dbCheckSchema);
export const migrationPlanResponseSchema = apiResponseSchema(migrationPlanSchema);
export const applyNextMigrationResponseSchema = apiResponseSchema(applyNextMigrationSchema);
export const retryMigrationResponseSchema = applyNextMigrationResponseSchema;
export const markMigrationAppliedResponseSchema = applyNextMigrationResponseSchema;
export const recoveryMigrationResponseSchema = apiResponseSchema(recoveryMigrationSchema);
