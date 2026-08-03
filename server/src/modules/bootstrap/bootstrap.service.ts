import { getMigrationsSteps, hasMigrationTable } from "../../migrations/utils";
import { checkConnection, getInstallationStatus, hasCompleteConfig, InstallationStatus } from "../../utils/db"
import { BootstrapStage } from "./bootstrap.types";

export const getBootstrapStatusService = async (): Promise<BootstrapStage> => {
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

    let installationStatus: InstallationStatus | undefined;

    try {
        installationStatus = await getInstallationStatus();
    } catch {
        return 'system_error';
    }

    switch (installationStatus?.status) {
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