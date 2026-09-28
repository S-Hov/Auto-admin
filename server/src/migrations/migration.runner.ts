import type { DatabaseExecutor } from "../db/contracts/executor.interface";
import { activeDatabaseProvider } from "../db/runtime/database.runtime";
import { MigrationVersionConflictError } from "./migration.errors";
import { buildMigrationPlan } from "./migration.plan";
import type { MigrationExecutionResult, MigrationPlan } from "./migration.types";
import { activeMigrationProvider } from "./runtime/migration.runtime";

export const loadCurrentMigrationPlan = async (
    executor: DatabaseExecutor,
): Promise<MigrationPlan> => {
    const repository = activeMigrationProvider.createRepository(executor);
    await repository.ensureMigrationHistoryTable();
    const catalog = await activeMigrationProvider.loadCatalog();
    const history = await repository.getMigrationHistory();
    return buildMigrationPlan(catalog, history);
};

export const getCurrentMigrationPlan = async (): Promise<MigrationPlan> => {
    return activeDatabaseProvider.withConnection(loadCurrentMigrationPlan);
};

export const applyNextMigration = async (
    expectedVersion: string,
): Promise<MigrationExecutionResult> => {
    return activeDatabaseProvider.withConnection(async (connection) => {
        let lockAcquired = false;
        try {
            await activeMigrationProvider.acquireLock(connection);
            lockAcquired = true;

            const plan = await loadCurrentMigrationPlan(connection);
            const next = plan.next;
            if (next === null) {
                return { applied: null, next: null, isComplete: true };
            }
            if (next.version !== expectedVersion) {
                throw new MigrationVersionConflictError(expectedVersion, next.version);
            }

            const repository = activeMigrationProvider.createRepository(connection);
            const startedAt = Date.now();
            await repository.insertRunningMigration(next, null);

            try {
                // MySQL DDL commits implicitly. History deliberately records a running
                // migration before the SQL and marks success only after execution.
                await connection.execute(next.sql, undefined, { timeoutMs: null });
                await repository.markMigrationApplied(next.version, Date.now() - startedAt);
                const followingMigration = plan.pending[1] ?? null;
                return {
                    applied: next,
                    next: followingMigration,
                    isComplete: followingMigration === null,
                };
            } catch (migrationError) {
                const errorMessage = migrationError instanceof Error
                    ? migrationError.message
                    : String(migrationError);
                try {
                    await repository.markMigrationFailed(
                        next.version,
                        Date.now() - startedAt,
                        errorMessage,
                    );
                } catch (historyError) {
                    throw new AggregateError(
                        [migrationError, historyError],
                        "Migration failed and its history could not be updated",
                    );
                }
                throw migrationError;
            }
        } finally {
            if (lockAcquired) await activeMigrationProvider.releaseLock(connection);
        }
    });
};
