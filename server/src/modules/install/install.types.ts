export interface DbCheckResponse {
    version?: string;
    redirectedTo?: string;
}

export interface RegisterResponse {
    redirectedTo?: string,
}

export interface MigrationsStepsResponse {
    steps: string[];
    nextStepUrl?: string;
}

export interface ApplyMigrationsStepResponse {
    nextStepUrl?: string;
}

export type InstallationStatusValue = 'new' | 'migrated' | 'ready';