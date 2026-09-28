import type {
    RecoveryAction,
    RecoveryAuditMeta,
    RecoveryResult,
} from "./migrations.types";
import type { MigrationDescriptor, MigrationHistoryRecord } from "../migration.types";

export interface MigrationHistoryRepository {
    ensureMigrationHistoryTable(): Promise<void>;
    getMigrationHistory(): Promise<ReadonlyArray<MigrationHistoryRecord>>;
    insertRunningMigration(descriptor: MigrationDescriptor, appVersion: string | null): Promise<void>;
    markMigrationApplied(version: string, executionMs: number): Promise<void>;
    markMigrationFailed(version: string, executionMs: number, errorMessage: string): Promise<void>;
    markMigrationAppliedFromRecovery(version: string): Promise<void>;
    prepareMigrationForRetry(version: string): Promise<void>;

    ensureMigrationRecoveryAuditTable(): Promise<void>;

    startMigrationRecoveryEvent(
        version: string,
        action: RecoveryAction,
        meta: RecoveryAuditMeta,
    ): Promise<number>;

    finishMigrationRecoveryEvent(
        eventId: number,
        result: Exclude<RecoveryResult, "started">,
        errorSummary: string | null,
    ): Promise<void>;
}
