import { checkConnection } from "../../db/checkConnection";
import { hasCompleteConfig } from "../../db/databaseConfig";
import { getMigrationsSteps, hasMigrationTable } from "../../migrations/utils";
import { readInstallationStatus } from '../install';
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

        if (!await hasMigrationTable()) {
            return 'migrations_required';
        }

        if ((await getMigrationsSteps()).length > 0) {
            return 'migrations_required';
        }

        const installationStatus = await readInstallationStatus();

        switch (installationStatus) {
            case 'new':
                return 'system_error';
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