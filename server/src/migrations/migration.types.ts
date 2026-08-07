export type MigrationDescriptor = {
    readonly version: string;
    readonly name: string;
    readonly fileName: string;
    readonly filePath: string;
    readonly checksum: string;
    readonly sql: string;
}

export type MigrationStatus = 'running' | 'completed' | 'failed';

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
} 