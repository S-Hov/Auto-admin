import type { z } from 'zod';
import type { dbCheckSchema, migrationStepSchema, migrationPlanSchema, applyNextMigrationSchema, recoveryMigrationSchema } from './install.schema';

export type DbCheckResponse = z.infer<typeof dbCheckSchema>;

export type MigrationStepResponse = z.infer<typeof migrationStepSchema>;

export type MigrationPlanResponse = z.infer<typeof migrationPlanSchema>;

export type ApplyNextMigrationResponse = z.infer<typeof applyNextMigrationSchema>;

export interface ApplyNextMigrationRequest {
    expectedVersion: string;
}

export interface DbConnectionPayload {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    type: 'mysql';
}

export interface RetryMigrationRequest {
    expectedVersion: string;
    checksum: string;
}

export type RetryMigrationResponse = z.infer<typeof applyNextMigrationSchema>;

export interface MarkMigrationAppliedRequest {
    expectedVersion: string;
    checksum: string;
}

export type MarkMigrationAppliedResponse = z.infer<typeof applyNextMigrationSchema>;

export type RecoveryMigrationResponse = z.infer<typeof recoveryMigrationSchema>;
