export type { DbCheckResponse, MigrationStepResponse, MigrationPlanResponse, ApplyNextMigrationResponse, RecoveryMigrationResponse, SystemConfigurationOptionsResponse } from '@auto-admin/contracts/install';
export type InstallationStatusValue = 'new' | 'migrated' | 'ready';
export interface InstallationStatus { status: InstallationStatusValue; }
