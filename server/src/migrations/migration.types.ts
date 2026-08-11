export type MigrationDescriptor = {
    readonly version: string;
    readonly name: string;
    readonly fileName: string;
    readonly filePath: string;
    readonly checksum: string;
    readonly sql: string;
}

export type MigrationStatus = 'running' | 'applied' | 'failed';

export type MigrationHistoryRecord = {
    readonly version: string;
    readonly name: string;
    readonly fileName: string;
    readonly checksum: string;
    readonly status: MigrationStatus;
    readonly startedAt: Date;
    readonly finishedAt: Date | null;
    readonly executionMs: number | null;
    readonly errorMessage: string | null;
    readonly attemptCount: number;
    readonly appVersion: string | null;
    readonly updatedAt: Date;
}

export type MigrationPlan = {
    readonly applied: ReadonlyArray<MigrationHistoryRecord>;
    readonly pending: ReadonlyArray<MigrationDescriptor>;
    readonly next: MigrationDescriptor | null;
    readonly isComplete: boolean;
}

export interface MigrationStepResponse {
    version: string;
    name: string;
    fileName: string;
}

export interface MigrationPlanResponse {
    pending: MigrationStepResponse[];
    nextVersion: string | null;
    isComplete: boolean;
}