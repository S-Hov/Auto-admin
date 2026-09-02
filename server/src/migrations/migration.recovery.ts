import { version } from "node:os";
import { ERROR_CODES } from "../shared/api/codes/error-codes";
import { badRequest, conflict } from "../shared/api/errors/error-helpers";
import { createMigrationConnection } from "./migration.db";
import { acquireMigrationLock, releaseMigrationLock } from "./migration.lock";
import { getMigrationHistory, markMigrationApplied } from "./migration.repository";
import { applyNextMigration } from "./migration.runner";
import { MigrationExecutionResult } from "./migration.types";

export const retryMigration = async (expectedVersion: string, checksum: string): Promise<MigrationExecutionResult> => {
    const connection = await createMigrationConnection();
    let lockAcquired = false;

    try {
        await acquireMigrationLock(connection);
        lockAcquired = true;
        const history = await getMigrationHistory(connection);

        if (history.length === 0) {
            throw badRequest(ERROR_CODES.INSTALL_MIGRATION_NOT_FOUND);
        }

        const lastMigration = history[-1];
        if (lastMigration.status === 'applied') {
            throw badRequest(ERROR_CODES.INSTALL_MIGRATION_ALREADY_APPLIED);
        }
        if (lastMigration.version !== expectedVersion || lastMigration.checksum !== checksum) {
            throw conflict(ERROR_CODES.INSTALL_MIGRATION_VERSION_CONFLICT);
        }

        const result = await applyNextMigration(expectedVersion);

        return result;
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

export const markMigrationAppliedManually = async (expectedVersion: string, checksum: string): Promise<void> => {
    const connection = await createMigrationConnection();
    let lockAcquired = false;

    try {
        await acquireMigrationLock(connection);
        lockAcquired = true;
        const history = await getMigrationHistory(connection);

        if (history.length === 0) {
            throw badRequest(ERROR_CODES.INSTALL_MIGRATION_NOT_FOUND);
        }

        const lastMigration = history[-1];
        if (lastMigration.status === 'applied') {
            throw badRequest(ERROR_CODES.INSTALL_MIGRATION_ALREADY_APPLIED);
        }
        if (lastMigration.version !== expectedVersion || lastMigration.checksum !== checksum) {
            throw conflict(ERROR_CODES.INSTALL_MIGRATION_VERSION_CONFLICT);
        }

        await markMigrationApplied(connection, expectedVersion, 1)
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