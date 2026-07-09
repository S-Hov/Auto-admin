export interface DbCheckResponse {
    version?: string;
    redirectedTo?: string;
}

export interface MigrationStepsResponse {
    steps: string[];
    nextStepUrl?: string;
}

