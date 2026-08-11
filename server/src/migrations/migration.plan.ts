import type { MigrationDescriptor, MigrationHistoryRecord, MigrationPlan } from "./migration.types";

export const buildMigrationPlan = (catalog: ReadonlyArray<MigrationDescriptor>, history: ReadonlyArray<MigrationHistoryRecord>): MigrationPlan => {
    for (let i = 0; i < history.length; i++) {
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
            throw new Error(
                `Migration version "${record.version}" is in "${record.status}" state; recovery is required before continuing`
            );
        }
    }

    const pending = catalog.slice(history.length);
    const next = pending[0] ?? null;

    return {
        applied: history,
        pending,
        next,
        isComplete: pending.length === 0
    };
}   
