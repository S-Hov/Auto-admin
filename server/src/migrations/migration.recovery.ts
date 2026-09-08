import { ERROR_CODES } from "../shared/api/codes/error-codes";
import { badRequest, conflict } from "../shared/api/errors/error-helpers";
import { createMigrationConnection } from "./migration.db";
import { acquireMigrationLock, releaseMigrationLock } from "./migration.lock";
import { getMigrationHistory, markMigrationApplied, markMigrationAppliedFromRecovery, markMigrationFailed, prepareMigrationForRetry } from "./migration.repository";
import { loadCurrentMigrationPlan } from "./migration.runner";
import { MigrationExecutionResult } from "./migration.types";
import { loadMigrationCatalog } from "./migration.catalog";
import { verifyMigrationApplied } from "./migration.verification";
import {
    ensureMigrationRecoveryAuditTable,
    finishMigrationRecoveryEvent,
    startMigrationRecoveryEvent,
    type RecoveryAuditMeta,
} from "./migration.recovery.repository";

const errorSummary = (error: unknown): string => error instanceof Error ? error.message : String(error);

export const retryMigration = async (
    expectedVersion: string,
    checksum: string,
    meta: RecoveryAuditMeta,
): Promise<MigrationExecutionResult> => {
    const connection = await createMigrationConnection();
    let lockAcquired = false;
    let recoveryEventId: number | null = null;

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

        await ensureMigrationRecoveryAuditTable(connection);
        recoveryEventId = await startMigrationRecoveryEvent(connection, expectedVersion, 'retry', meta);
        const startedAt = Date.now();

        await prepareMigrationForRetry(connection, expectedVersion);
        try {
            await connection.query(descriptor.sql);
            await markMigrationApplied(connection, expectedVersion, Date.now() - startedAt);
        }
        catch (migrationError) {
            try {
                await markMigrationFailed(connection, expectedVersion, Date.now() - startedAt, errorSummary(migrationError));
            }
            catch (historyError) {
                throw new AggregateError(
                    [migrationError, historyError],
                    'Migration retry failed and its history could not be updated',
                );
            }
            throw migrationError;
        }

        await finishMigrationRecoveryEvent(connection, recoveryEventId, 'succeeded');
        recoveryEventId = null;
        const plan = await loadCurrentMigrationPlan(connection);

        return {
            applied: descriptor,
            next: plan.next,
            isComplete: plan.isComplete
        };
    }
    catch (error) {
        if (recoveryEventId !== null) {
            try {
                await finishMigrationRecoveryEvent(connection, recoveryEventId, 'failed', errorSummary(error));
            }
            catch (auditError) {
                throw new AggregateError([error, auditError], 'Migration retry and recovery audit both failed');
            }
        }
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

export const markMigrationAppliedManually = async (
    expectedVersion: string,
    checksum: string,
    meta: RecoveryAuditMeta,
): Promise<MigrationExecutionResult> => {
    const connection = await createMigrationConnection();
    let lockAcquired = false;
    let recoveryEventId: number | null = null;

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

        await ensureMigrationRecoveryAuditTable(connection);
        recoveryEventId = await startMigrationRecoveryEvent(connection, expectedVersion, 'mark_applied', meta);

        const schemaMatches = await verifyMigrationApplied(connection, expectedVersion);
        if (!schemaMatches) {
            throw conflict(ERROR_CODES.INSTALL_MIGRATION_SCHEMA_VERIFICATION_FAILED);
        }

        await markMigrationAppliedFromRecovery(connection, expectedVersion);
        await finishMigrationRecoveryEvent(connection, recoveryEventId, 'succeeded');
        recoveryEventId = null;

        const plan = await loadCurrentMigrationPlan(connection);
        return {
            applied: descriptor!,
            next: plan.next,
            isComplete: plan.isComplete
        };
    }
    catch (error) {
        if (recoveryEventId !== null) {
            try {
                await finishMigrationRecoveryEvent(connection, recoveryEventId, 'failed', errorSummary(error));
            }
            catch (auditError) {
                throw new AggregateError([error, auditError], 'Manual migration recovery and audit both failed');
            }
        }
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
