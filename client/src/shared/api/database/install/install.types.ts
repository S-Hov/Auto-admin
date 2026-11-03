import type { CheckConnectionData } from '@auto-admin/contracts/install';
export type {
 DbCheckResponse, MigrationStepResponse, MigrationPlanResponse, ApplyNextMigrationResponse, RecoveryMigrationResponse,
 ApplyNextMigrationData as ApplyNextMigrationRequest,
 RecoveryData as RetryMigrationRequest, RecoveryData as MarkMigrationAppliedRequest,
 ApplyNextMigrationResponse as RetryMigrationResponse, ApplyNextMigrationResponse as MarkMigrationAppliedResponse,
} from '@auto-admin/contracts/install';
// UI legacy selector; the HTTP connection request itself is CheckConnectionData.
export type DbConnectionPayload = CheckConnectionData & { type: 'mysql' };
