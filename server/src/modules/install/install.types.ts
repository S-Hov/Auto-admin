export interface DbConnectionData {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}

export interface DbCheckResponse {
    version?: string;
    redirectedTo?: string;
}

export interface RegisterData {
    userName: string;
    password: string;
    confirmPassword: string;
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