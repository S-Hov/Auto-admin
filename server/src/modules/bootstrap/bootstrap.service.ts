import { getPool } from "../../db";
import { hasCompleteConfig } from "../../db/databaseConfig";
import { MigrationRecoveryRequiredError } from "../../migrations/migration.errors";
import { getCurrentMigrationPlan } from "../../migrations/migration.runner";
import { readInstallationStatus, markMigrationsCompleted } from "../install";
import type { BootstrapStage } from "./bootstrap.types";
import { logger } from "../../shared/logger";
import { activeDatabaseProvider } from "../../db/database.runtime";

export const getBootstrapStatusService = async (): Promise<BootstrapStage> => {
    try {
        if (!hasCompleteConfig()) {
            return "database_required";
        }

        try {
            const provider = activeDatabaseProvider;
            await provider.checkConnection(provider.getConnectionConfig());
        } catch {
            return "database_unavailable";
        }

        let plan: Awaited<ReturnType<typeof getCurrentMigrationPlan>>;

        try {
            plan = await getCurrentMigrationPlan();
        } catch (error) {
            if (error instanceof MigrationRecoveryRequiredError) {
                return "migration_recovery_required";
            }
            throw error;
        }

        if (!plan.isComplete) {
            return "migrations_required";
        }

        const installationStatus = await readInstallationStatus();

        if (installationStatus === "new") {
            await markMigrationsCompleted(getPool());
            return "admin_required";
        }

        switch (installationStatus) {
            case "migrated":
                return "admin_required";
            case "ready":
                return "ready";
            default:
                return "system_error";
        }
    } catch (error) {
        logger.error(
            { err: error, service: "bootstrap-status" },
            "Unexpected bootstrap status error",
        );
        return "system_error";
    }
};
