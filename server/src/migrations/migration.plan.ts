import type { MigrationDescriptor, MigrationHistoryRecord, MigrationPlan } from "./migration.types";

export const buildMigrationPlan = (catalog: MigrationDescriptor[], history: ReadonlyArray<MigrationHistoryRecord>): MigrationPlan => {
    const result: MigrationPlan = {
        applied: [],
        pending: [],
        next: null,
        isComplete: true,
    };

    for (let i = 0; i< history.length; i++) {
        const record = history[i];

    }
    return result;
}