import type { DatabaseExecutor } from "../db/contracts/executor.interface";
import { databaseRuntime } from "../db/runtime/database.runtime";
import type { MigrationProvider } from "./contracts/migration-provider.interface";
import { MigrationVersionConflictError } from "./migration.errors";
import { buildMigrationPlan } from "./migration.plan";
import type { MigrationExecutionResult, MigrationPlan } from "./migration.types";
import { getActiveMigrationProvider } from "./runtime/migration.runtime";

export const loadCurrentMigrationPlan = async (
    executor: DatabaseExecutor,
    migrationProvider: MigrationProvider = getActiveMigrationProvider(),
): Promise<MigrationPlan> => {
    const repository = migrationProvider.createRepository(executor);
    await repository.ensureMigrationHistoryTable();
    const catalog = await migrationProvider.loadCatalog();
    const history = await repository.getMigrationHistory();
    return buildMigrationPlan(catalog, history);
};

export const getCurrentMigrationPlan = async (): Promise<MigrationPlan> => {
    const databaseProvider = databaseRuntime.getProvider();
    const migrationProvider = getActiveMigrationProvider();
    return databaseProvider.withConnection((connection) =>
        loadCurrentMigrationPlan(connection, migrationProvider),
    );
};

export const applyNextMigration = async (
    expectedVersion: string,
): Promise<MigrationExecutionResult> => {
    const databaseProvider = databaseRuntime.getProvider();
    const migrationProvider = getActiveMigrationProvider();

    return databaseProvider.withConnection(async (connection) => {
        let lockAcquired = false;
        try {
            await migrationProvider.acquireLock(connection);
            lockAcquired = true;

            const plan = await loadCurrentMigrationPlan(
                connection,
                migrationProvider,
            );
            const next = plan.next;
            if (next === null) {
                return { applied: null, next: null, isComplete: true };
            }
            if (next.version !== expectedVersion) {
                throw new MigrationVersionConflictError(expectedVersion, next.version);
            }

            const repository = migrationProvider.createRepository(connection);
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
            if (lockAcquired) await migrationProvider.releaseLock(connection);
        }
    });
};
