import { ERROR_CODES } from "../shared/api/codes/error-codes";
import { badRequest, conflict } from "../shared/api/errors/error-helpers";
import { createMigrationConnection } from "./migration.db";
import { acquireMigrationLock, releaseMigrationLock } from "./migration.lock";
import { getMigrationHistory, markMigrationApplied } from "./migration.repository";
import { loadCurrentMigrationPlan } from "./migration.runner";
import { MigrationExecutionResult } from "./migration.types";
import { loadMigrationCatalog } from "./migration.catalog";

export const retryMigration = async (expectedVersion: string, checksum: string): Promise<MigrationExecutionResult> => {
    const connection = await createMigrationConnection();
    let lockAcquired = false;

    try {
        await acquireMigrationLock(connection);
        lockAcquired = true;
        const history = await getMigrationHistory(connection);
        const catalog = await loadMigrationCatalog();
        const descriptor = catalog.find(m => m.version === expectedVersion);

        if (history.length === 0) {
            throw badRequest(ERROR_CODES.INSTALL_MIGRATION_NOT_FOUND);
        }

        const lastMigration = history[history.length - 1];
        if (lastMigration.status === 'applied') {
            throw badRequest(ERROR_CODES.INSTALL_MIGRATION_ALREADY_APPLIED);
        }
        if (!descriptor || lastMigration.version !== expectedVersion || lastMigration.checksum !== checksum || descriptor.checksum !== checksum) {
            throw conflict(ERROR_CODES.INSTALL_MIGRATION_VERSION_CONFLICT);
        }
        const startedAt = Date.now();

        await connection.query(descriptor.sql);
        await markMigrationApplied(connection, expectedVersion, Date.now() - startedAt);
        const plan = await loadCurrentMigrationPlan(connection);

        return {
            applied: descriptor,
            next: plan.next,
            isComplete: plan.isComplete
        };
    }
    catch (error) {
        throw error;
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
}

export const markMigrationAppliedManually = async (expectedVersion: string, checksum: string): Promise<MigrationExecutionResult> => {
    const connection = await createMigrationConnection();
    let lockAcquired = false;

    try {
        await acquireMigrationLock(connection);
        lockAcquired = true;
        const history = await getMigrationHistory(connection);
        const catalog = await loadMigrationCatalog();
        const descriptor = catalog.find(m => m.version === expectedVersion);

        if (history.length === 0) {
            throw badRequest(ERROR_CODES.INSTALL_MIGRATION_NOT_FOUND);
        }

        const lastMigration = history[history.length - 1];
        if (lastMigration.status === 'applied') {
            throw badRequest(ERROR_CODES.INSTALL_MIGRATION_ALREADY_APPLIED);
        }
        if (!descriptor || lastMigration.version !== expectedVersion || lastMigration.checksum !== checksum || descriptor.checksum !== checksum) {
            throw conflict(ERROR_CODES.INSTALL_MIGRATION_VERSION_CONFLICT);
        }

        await markMigrationApplied(connection, expectedVersion, 0);

        const plan = await loadCurrentMigrationPlan(connection);
        return {
            applied: descriptor!,
            next: plan.next,
            isComplete: plan.isComplete
        };
    }
    catch (error) {
        throw error;
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
}