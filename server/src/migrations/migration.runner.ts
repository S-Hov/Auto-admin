import type { Connection, PoolConnection } from "mysql2/promise";
import { loadMigrationCatalog } from "./migration.catalog";
import { acquireMigrationLock, releaseMigrationLock } from "./migration.lock";
import { buildMigrationPlan } from "./migration.plan";
import { ensureMigrationHistoryTable, getMigrationHistory, insertRunningMigration, markMigrationApplied, markMigrationFailed } from "./migration.repository";
import type { MigrationExecutionResult, MigrationPlan } from "./migration.types";
import { MigrationVersionConflictError } from "./migration.errors";
import { createMigrationConnection } from "./migration.db";

export const applyNextMigration = async (expectedVersion: string): Promise<MigrationExecutionResult> => {
    const connection = await createMigrationConnection();
    let lockAcquired = false;

    try {
        await acquireMigrationLock(connection);
        lockAcquired = true;

        const plan = await loadCurrentMigrationPlan(connection);

        const next = plan.next;
        if (next === null) return {applied: null, next: null, isComplete: true};
        if (next.version !== expectedVersion) {
            throw new MigrationVersionConflictError(expectedVersion, next.version);
        }
        const startedAt = Date.now();

        await insertRunningMigration(connection, next, null);

        try {
            await connection.query(next.sql);
            const executionMs = Date.now() - startedAt;
            await markMigrationApplied(connection, next.version, executionMs);
            const followingMigration = plan.pending[1] ?? null;
            return {
                applied: next,
                next: followingMigration,
                isComplete: followingMigration === null
            };
        }
        catch (migrationError) {
            const executionMs = Date.now() - startedAt;
            const errorMessage = migrationError instanceof Error ? migrationError.message : String(migrationError);
            try {
                await markMigrationFailed(connection, next.version, executionMs, errorMessage);
            }
            catch (historyError) {
                throw new AggregateError(
                    [migrationError, historyError],
                    'Миграция завершилась с ошибкой, и ошибка не была записана в историю'
                );
            }
            throw migrationError;
        }
    }
    finally {
        try {
            if (lockAcquired) {
                await releaseMigrationLock(connection);
            }
        } finally {
            await connection.end();
        }
    }
};

const loadCurrentMigrationPlan = async (connection: Connection): Promise<MigrationPlan> => {
    await ensureMigrationHistoryTable(connection);
    const catalog = await loadMigrationCatalog();
    const history = await getMigrationHistory(connection);

    return buildMigrationPlan(catalog, history);
}

export const getCurrentMigrationPlan = async (): Promise<MigrationPlan> => {
    const connection = await createMigrationConnection();
    try {
        return await loadCurrentMigrationPlan(connection);
    }
    finally {
        await connection.end();
    }
}