export interface DbCheckResponse {
    version?: string;
    redirectedTo?: string;
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

export interface ApplyNextMigrationResponse {
    applied: MigrationStepResponse | null;
    nextVersion: string | null;
    isComplete: boolean;
}

export interface ApplyNextMigrationRequest {
    expectedVersion: string;
}

export interface DbConnectionPayload {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}

export interface RetryMigrationRequest {
    expectedVersion: string;
    checksum: string;
}

export interface RetryMigrationResponse {
    applied: MigrationStepResponse | null;
    nextVersion: string | null;
    isComplete: boolean;
}

export interface MarkMigrationAppliedRequest {
    expectedVersion: string;
    checksum: string;
}

export interface MarkMigrationAppliedResponse {
    applied: MigrationStepResponse | null;
    nextVersion: string | null;
    isComplete: boolean;
}