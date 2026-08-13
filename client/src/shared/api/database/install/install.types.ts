export interface DbCheckResponse {
    version?: string;
    redirectedTo?: string;
}

export interface MigrationsStepsResponse {
    steps: string[];
    nextStepUrl?: string;
}

export interface ApplyMigrationsStepResponse {
    nextStepUrl?: string;
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