import { activeDatabaseProvider } from "../db/runtime/database.runtime";
import { ERROR_CODES } from "../shared/api/codes/error-codes";
import { badRequest, conflict } from "../shared/api/errors/error-helpers";
import type { RecoveryAuditMeta } from "./contracts/migrations.types";
import { loadCurrentMigrationPlan } from "./migration.runner";
import type { MigrationExecutionResult } from "./migration.types";
import { activeMigrationProvider } from "./runtime/migration.runtime";

const errorSummary = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

export const retryMigration = async (
    expectedVersion: string,
    checksum: string,
    meta: RecoveryAuditMeta,
): Promise<MigrationExecutionResult> => {
    return activeDatabaseProvider.withConnection(async (connection) => {
        const repository = activeMigrationProvider.createRepository(connection);
        let lockAcquired = false;
        let recoveryEventId: number | null = null;

        try {
            await activeMigrationProvider.acquireLock(connection);
            lockAcquired = true;
            const history = await repository.getMigrationHistory();
            const catalog = await activeMigrationProvider.loadCatalog();
            const descriptor = catalog.find((migration) => migration.version === expectedVersion);

            if (history.length === 0) {
                throw badRequest(ERROR_CODES.INSTALL_MIGRATION_NOT_FOUND);
            }
            const lastMigration = history[history.length - 1];
            if (lastMigration.status === "applied") {
                throw badRequest(ERROR_CODES.INSTALL_MIGRATION_ALREADY_APPLIED);
            }
            if (!descriptor || lastMigration.version !== expectedVersion
                || lastMigration.checksum !== checksum || descriptor.checksum !== checksum) {
                throw conflict(ERROR_CODES.INSTALL_MIGRATION_VERSION_CONFLICT);
            }

            await repository.ensureMigrationRecoveryAuditTable();
            recoveryEventId = await repository.startMigrationRecoveryEvent(
                expectedVersion, "retry", meta,
            );
            const startedAt = Date.now();

            await repository.prepareMigrationForRetry(expectedVersion);
            try {
                await connection.execute(descriptor.sql, undefined, { timeoutMs: null });
                await repository.markMigrationApplied(expectedVersion, Date.now() - startedAt);
            } catch (migrationError) {
                try {
                    await repository.markMigrationFailed(
                        expectedVersion,
                        Date.now() - startedAt,
                        errorSummary(migrationError),
                    );
                } catch (historyError) {
                    throw new AggregateError(
                        [migrationError, historyError],
                        "Migration retry failed and its history could not be updated",
                    );
                }
                throw migrationError;
            }

            await repository.finishMigrationRecoveryEvent(recoveryEventId, "succeeded", null);
            recoveryEventId = null;
            const plan = await loadCurrentMigrationPlan(connection);
            return { applied: descriptor, next: plan.next, isComplete: plan.isComplete };
        } catch (error) {
            if (recoveryEventId !== null) {
                try {
                    await repository.finishMigrationRecoveryEvent(
                        recoveryEventId, "failed", errorSummary(error),
                    );
                } catch (auditError) {
                    throw new AggregateError(
                        [error, auditError],
                        "Migration retry and recovery audit both failed",
                    );
                }
            }
            throw error;
        } finally {
            if (lockAcquired) await activeMigrationProvider.releaseLock(connection);
        }
    });
};

export const markMigrationAppliedManually = async (
    expectedVersion: string,
    checksum: string,
    meta: RecoveryAuditMeta,
): Promise<MigrationExecutionResult> => {
    return activeDatabaseProvider.withConnection(async (connection) => {
        const repository = activeMigrationProvider.createRepository(connection);
        let lockAcquired = false;
        let recoveryEventId: number | null = null;

        try {
            await activeMigrationProvider.acquireLock(connection);
            lockAcquired = true;
            const history = await repository.getMigrationHistory();
            const catalog = await activeMigrationProvider.loadCatalog();
            const descriptor = catalog.find((migration) => migration.version === expectedVersion);

            if (history.length === 0) {
                throw badRequest(ERROR_CODES.INSTALL_MIGRATION_NOT_FOUND);
            }
            const lastMigration = history[history.length - 1];
            if (lastMigration.status === "applied") {
                throw badRequest(ERROR_CODES.INSTALL_MIGRATION_ALREADY_APPLIED);
            }
            if (!descriptor || lastMigration.version !== expectedVersion
                || lastMigration.checksum !== checksum || descriptor.checksum !== checksum) {
                throw conflict(ERROR_CODES.INSTALL_MIGRATION_VERSION_CONFLICT);
            }

            await repository.ensureMigrationRecoveryAuditTable();
            recoveryEventId = await repository.startMigrationRecoveryEvent(
                expectedVersion, "mark_applied", meta,
            );

            const schemaMatches = await activeMigrationProvider.verifyApplied(
                connection, expectedVersion,
            );
            if (!schemaMatches) {
                throw conflict(ERROR_CODES.INSTALL_MIGRATION_SCHEMA_VERIFICATION_FAILED);
            }

            await repository.markMigrationAppliedFromRecovery(expectedVersion);
            await repository.finishMigrationRecoveryEvent(recoveryEventId, "succeeded", null);
            recoveryEventId = null;

            const plan = await loadCurrentMigrationPlan(connection);
            return { applied: descriptor, next: plan.next, isComplete: plan.isComplete };
        } catch (error) {
            if (recoveryEventId !== null) {
                try {
                    await repository.finishMigrationRecoveryEvent(
                        recoveryEventId, "failed", errorSummary(error),
                    );
                } catch (auditError) {
                    throw new AggregateError(
                        [error, auditError],
                        "Manual migration recovery and audit both failed",
                    );
                }
            }
            throw error;
        } finally {
            if (lockAcquired) await activeMigrationProvider.releaseLock(connection);
        }
    });
};
