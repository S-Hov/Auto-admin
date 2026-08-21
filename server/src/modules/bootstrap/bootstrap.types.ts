export type BootstrapStage =
    | 'database_required'
    | 'database_unavailable'
    | 'migrations_required'
    | 'migration_recovery_required'
    | 'admin_required'
    | 'ready'
    | 'system_error';

export interface BootstrapStatusResponse {
    stage: BootstrapStage;
}