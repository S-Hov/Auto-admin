export type BootstrapStage =
    | 'system_configuration_required'
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