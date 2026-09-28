import type { MigrationStatus } from "../../migrations/migration.types";

export interface DbCheckResponse {
    version?: string;
    redirectedTo?: string;
}

export type InstallationStatusValue = "new" | "migrated" | "ready";

export interface InstallationStatus {
    status: InstallationStatusValue;
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

export interface RecoveryMigrationResponse {
    version: string;
    name: string;
    checksum: string;
    status: Exclude<MigrationStatus, "applied">;
}
