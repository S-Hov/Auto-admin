import { getPool } from "../../db";
import { checkConnection } from "../../db/checkConnection";
import { hasCompleteConfig } from "../../db/databaseConfig";
import { MigrationRecoveryRequiredError } from "../../migrations/migration.errors";
import { getCurrentMigrationPlan } from "../../migrations/migration.runner";
import { readInstallationStatus, markMigrationsCompleted } from '../install';
import type { BootstrapStage } from "./bootstrap.types";

export const getBootstrapStatusService = async (): Promise<BootstrapStage> => {
    try {
        if (!hasCompleteConfig()) {
            return 'database_required';
        }

        try {
            await checkConnection({
                host: process.env.Auto_Admin__DB_HOST!,
                port: Number(process.env.Auto_Admin__DB_PORT!),
                database: process.env.Auto_Admin__DB_DATABASE!,
                user: process.env.Auto_Admin__DB_USERNAME!,
                password: process.env.Auto_Admin__DB_PASSWORD!,
            });
        } catch {
            return 'database_unavailable';
        }

        let plan: Awaited<ReturnType<typeof getCurrentMigrationPlan>>;

        try {
            plan = await getCurrentMigrationPlan();
        }
        catch (error) {
            if (error instanceof MigrationRecoveryRequiredError) {
                return 'migration_recovery_required';
            }
            throw error;
        }
        
        if (!plan.isComplete) {
            return 'migrations_required';
        }

        const installationStatus = await readInstallationStatus();

        if (installationStatus === 'new') {
            await markMigrationsCompleted(getPool());
            return 'admin_required';
        }

        switch (installationStatus) {
            case 'migrated':
                return 'admin_required';
            case 'ready':
                return 'ready';
            default:
                return 'system_error';
        }
    }
    catch (error) {
        return 'system_error';
    }
}