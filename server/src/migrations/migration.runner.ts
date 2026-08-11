import type { PoolConnection } from "mysql2/promise";
import { getPool } from "../db";
import { loadMigrationCatalog } from "./migration.catalog";
import { acquireMigrationLock, releaseMigrationLock } from "./migration.lock";
import { buildMigrationPlan } from "./migration.plan";
import { ensureMigrationHistoryTable, getMigrationHistory, insertRunningMigration, markMigrationApplied, markMigrationFailed } from "./migration.repository";
import type { MigrationDescriptor, MigrationPlan } from "./migration.types";

export const applyNextMigration = async (expectedVersion: string): Promise<MigrationDescriptor | null> => {
    const connection = await getPool().getConnection();
    let lockAcquired = false;

    try {
        await acquireMigrationLock(connection);
        lockAcquired = true;

        const plan = await loadCurrentMigrationPlan(connection);

        const next = plan.next;
        if (next === null) return null;
        if (next.version !== expectedVersion) {
            throw new Error(`Версия миграции ${next.version} не совпадает с ожидаемой ${expectedVersion}`);
        }
        const startedAt = Date.now();

        await insertRunningMigration(connection, next, null);

        try {
            await connection.query(next.sql);
            const executionMs = Date.now() - startedAt;
            await markMigrationApplied(connection, next.version, executionMs);
            return next;
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
            connection.release();
        }
    }
};

const loadCurrentMigrationPlan = async (connection: PoolConnection): Promise<MigrationPlan> => {
    try {
        await ensureMigrationHistoryTable(connection);
        const catalog = await loadMigrationCatalog();
        const history = await getMigrationHistory(connection);

        return buildMigrationPlan(catalog, history);
    }
    catch (error) {
        throw new Error(`Не удалось загрузить план миграций: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export const getCurrentMigrationPlan = async (): Promise<MigrationPlan> => {
    const connection = await getPool().getConnection();
    try {
        return await loadCurrentMigrationPlan(connection);
    } 
    finally {
        connection.release();
    }
}