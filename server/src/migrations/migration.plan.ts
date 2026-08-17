import { MigrationRecoveryRequiredError } from "./migration.errors";
import type { MigrationDescriptor, MigrationHistoryRecord, MigrationPlan } from "./migration.types";

export const buildMigrationPlan = (catalog: ReadonlyArray<MigrationDescriptor>, history: ReadonlyArray<MigrationHistoryRecord>): MigrationPlan => {
    const isLastRecordFailed = history.length > 0 &&
        (history[history.length - 1].status === 'failed' || history[history.length - 1].status === 'running');

    for (let i = 0; i < (isLastRecordFailed ? history.length - 1 : history.length); i++) {
        const record = history[i];
        const descriptor = catalog[i];

        if (!descriptor) {
            throw new Error(`Migration history contains unknown version "${record.version}"`);
        }

        if (record.version !== descriptor.version) {
            throw new Error(
                `Migration order mismatch: expected version "${descriptor.version}", found "${record.version}"`
            );
        }
        if (record.checksum !== descriptor.checksum) {
            throw new Error(
                `Migration checksum mismatch for version "${record.version}": expected "${descriptor.checksum}", found "${record.checksum}"`
            );
        }
        if (record.name !== descriptor.name) {
            throw new Error(
                `Migration name mismatch for version "${record.version}": expected "${descriptor.name}", found "${record.name}"`
            );
        }
        if (record.fileName !== descriptor.fileName) {
            throw new Error(
                `Migration file name mismatch for version "${record.version}": expected "${descriptor.fileName}", found "${record.fileName}"`
            );
        }
        if (record.status !== 'applied') {
            throw new MigrationRecoveryRequiredError(record.version, record.status, 'Статус миграции отличается от applied');
        }
    }

    // if (isLastRecordFailed) {
    //     const lastFailedRecord = history[history.length - 1];
    //     const descriptor = catalog[history.length - 1];

    //     if (lastFailedRecord.version !== descriptor.version) {
    //         throw new Error(
    //             `Migration order mismatch: expected version "${descriptor.version}", found "${lastFailedRecord.version}"`
    //         );
    //     }
    // }

    // const applied = isLastRecordFailed ? history.slice(0, -1) : history;
    const applied = history;
    const pending = catalog.slice(applied.length);
    const next = pending[0] ?? null;

    return {
        applied,
        pending,
        next,
        isComplete: pending.length === 0
    };
}   
