import { updateEnvironment } from "../../config/env-file";
import { badRequest, conflict } from "../../shared/api/errors/error-helpers";
import type {
    ApplyNextMigrationResponse,
    DbCheckResponse,
    MigrationPlanResponse,
    MigrationStepResponse,
    RecoveryMigrationResponse,
    SystemConfigurationOptionsResponse,
} from "./install.types";
import { PagePaths } from "../../constants/pagePaths";
import {
    applyNextMigration,
    getCurrentMigrationPlan,
} from "../../migrations/migration.runner";
import {
    MigrationLockUnavailableError,
    MigrationVersionConflictError,
} from "../../migrations/migration.errors";
import type { MigrationExecutionResult } from "../../migrations/migration.types";
import { ERROR_CODES } from "../../shared/api/codes/error-codes";
import {
    markMigrationAppliedManually,
    retryMigration,
} from "../../migrations/migration.recovery";
import { getActiveMigrationProvider } from "../../migrations/runtime/migration.runtime";
import { AsyncMutex } from "../../shared/concurrency/AsyncMutex";
import type { RequestMeta } from "../../utils/getRequestMeta";
import type { CheckConnectionData } from "./schema/checkConnection.schema";
import { getDatabaseProvider } from "../../db/providers/provider.registry";
import { getActiveInstallRepository } from "./repository/runtime/install-repository.runtime";
import { getSupportedDatabases } from "../../db/catalog/database.catalog";
import type { DatabaseType } from "../../db/contracts/database.types";
import type { DatabaseConnectionConfig } from "../../db/contracts/connection.types";
import { databaseRuntime } from "../../db/runtime/database.runtime";
import { UnsupportedDatabaseError } from "../../db/errors/database.errors";

const databaseConfigurationMutex = new AsyncMutex();

export const checkConnectionService = async (
    data: CheckConnectionData,
): Promise<DbCheckResponse> => {
    const release = await databaseConfigurationMutex.acquire();
    try {
        const provider = databaseRuntime.getProvider();

        if (provider.hasCompleteConfig()) {
            throw conflict(
                ERROR_CODES.INSTALL_DATABASE_CONFIGURATION_NOT_ALLOWED,
            );
        }

        let versionInfo: { version?: string };

        try {
            const connectionConfig = {
                ...data,
                type: provider.type,
            } as DatabaseConnectionConfig;
            versionInfo = await provider.checkConnection(connectionConfig);
        } catch (error) {
            throw badRequest(ERROR_CODES.INSTALL_DATABASE_CONNECTION_FAILED);
        }

        const databaseEnv = {
            Auto_Admin__DB_HOST: data.host,
            Auto_Admin__DB_PORT: String(data.port),
            Auto_Admin__DB_DATABASE: data.database,
            Auto_Admin__DB_USERNAME: data.user,
            Auto_Admin__DB_PASSWORD: data.password,
        };

        await updateEnvironment(databaseEnv);
        await provider.close();

        return { ...versionInfo, redirectedTo: PagePaths.login };
    } finally {
        release();
    }
};

export const getMigrationPlanService =
    async (): Promise<MigrationPlanResponse> => {
        const plan = await getCurrentMigrationPlan();
        return {
            pending: plan.pending.map((migration) => {
                return {
                    version: migration.version,
                    name: migration.name,
                    fileName: migration.fileName,
                };
            }),
            nextVersion: plan.next?.version ?? null,
            isComplete: plan.isComplete,
        };
    };

export const applyNextMigrationService = async (
    expectedVersion: string,
): Promise<ApplyNextMigrationResponse> => {
    let applied: MigrationStepResponse | null = null;
    let result: MigrationExecutionResult;

    try {
        result = await applyNextMigration(expectedVersion);
        if (result.isComplete)
            await getActiveInstallRepository().markMigrationsCompleted();
    } catch (error) {
        if (error instanceof MigrationLockUnavailableError) {
            throw conflict(ERROR_CODES.INSTALL_MIGRATIONS_ALREADY_RUNNING);
        }
        if (error instanceof MigrationVersionConflictError) {
            throw conflict(ERROR_CODES.INSTALL_MIGRATION_VERSION_CONFLICT, {
                params: {
                    expectedVersion: error.expectedVersion,
                    actualVersion: error.actualVersion,
                },
            });
        }
        throw error;
    }

    if (result.applied !== null) {
        applied = {
            version: result.applied.version,
            name: result.applied.name,
            fileName: result.applied.fileName,
        };
    }

    return {
        applied,
        nextVersion: result.next?.version ?? null,
        isComplete: result.isComplete,
    };
};

export const retryMigrationService = async (
    expectedVersion: string,
    checksum: string,
    meta: RequestMeta,
): Promise<ApplyNextMigrationResponse> => {
    let applied: MigrationStepResponse | null = null;
    let result: MigrationExecutionResult;

    try {
        result = await retryMigration(expectedVersion, checksum, meta);
        if (result.isComplete)
            await getActiveInstallRepository().markMigrationsCompleted();
    } catch (error) {
        if (error instanceof MigrationLockUnavailableError) {
            throw conflict(ERROR_CODES.INSTALL_MIGRATIONS_ALREADY_RUNNING);
        }
        if (error instanceof MigrationVersionConflictError) {
            throw conflict(ERROR_CODES.INSTALL_MIGRATION_VERSION_CONFLICT, {
                params: {
                    expectedVersion: error.expectedVersion,
                    actualVersion: error.actualVersion,
                },
            });
        }
        throw error;
    }

    if (result.applied !== null) {
        applied = {
            version: result.applied.version,
            name: result.applied.name,
            fileName: result.applied.fileName,
        };
    }

    return {
        applied,
        nextVersion: result.next?.version ?? null,
        isComplete: result.isComplete,
    };
};

export const markMigrationAppliedService = async (
    expectedVersion: string,
    checksum: string,
    meta: RequestMeta,
): Promise<ApplyNextMigrationResponse> => {
    try {
        const result = await markMigrationAppliedManually(
            expectedVersion,
            checksum,
            meta,
        );
        if (result.isComplete)
            await getActiveInstallRepository().markMigrationsCompleted();

        return {
            applied:
                result.applied === null
                    ? null
                    : {
                          version: result.applied.version,
                          name: result.applied.name,
                          fileName: result.applied.fileName,
                      },
            nextVersion: result.next?.version ?? null,
            isComplete: result.isComplete,
        };
    } catch (error) {
        if (error instanceof MigrationLockUnavailableError) {
            throw conflict(ERROR_CODES.INSTALL_MIGRATIONS_ALREADY_RUNNING);
        }
        if (error instanceof MigrationVersionConflictError) {
            throw conflict(ERROR_CODES.INSTALL_MIGRATION_VERSION_CONFLICT, {
                params: {
                    expectedVersion: error.expectedVersion,
                    actualVersion: error.actualVersion,
                },
            });
        }
        throw error;
    }
};

export const recoveryMigrationService =
    async (): Promise<RecoveryMigrationResponse> => {
        const repository = getActiveMigrationProvider().createRepository(
            databaseRuntime.getProvider(),
        );
        const history = await repository.getMigrationHistory();

        if (history.length === 0) {
            throw badRequest(ERROR_CODES.INSTALL_MIGRATION_NOT_FOUND);
        }

        const lastMigration = history[history.length - 1];
        if (lastMigration.status === "applied") {
            throw badRequest(ERROR_CODES.INSTALL_MIGRATION_ALREADY_APPLIED);
        }

        return {
            version: lastMigration.version,
            name: lastMigration.name,
            checksum: lastMigration.checksum,
            status: lastMigration.status,
        };
    };

export const getSystemConfigurationOptionsService =
    (): SystemConfigurationOptionsResponse => {
        const supportedDatabases = getSupportedDatabases();

        return {
            supportedDatabases: supportedDatabases.map(
                (database) => database.type,
            ),
        };
    };

export const systemConfigurationService =
    async (type: DatabaseType): Promise<void> => {
        const release = await databaseConfigurationMutex.acquire();

        try {
            if (databaseRuntime.isConfigured()) {
                throw conflict(
                    ERROR_CODES.INSTALL_DATABASE_CONFIGURATION_NOT_ALLOWED,
                );
            }

            try {
                getDatabaseProvider(type);
            } catch (error) {
                if (error instanceof UnsupportedDatabaseError) {
                    throw badRequest(ERROR_CODES.UNSUPPORTED_DATABASE);
                }
                throw error;
            }

            await updateEnvironment({ Auto_Admin__DB_TYPE: type });
            await databaseRuntime.configure(type);
        } finally {
            release();
        }
    };
