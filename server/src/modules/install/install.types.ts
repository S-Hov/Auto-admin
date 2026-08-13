import { RowDataPacket } from "mysql2";
import { AutoAdmin } from "../../db/db.types";

export interface DbCheckResponse {
    version?: string;
    redirectedTo?: string;
}

export interface RegisterResponse {
    redirectedTo?: string,
}

export type InstallationStatus = RowDataPacket &
    Pick<AutoAdmin.Installation, 'status'>

export type InstallationStatusValue =
    AutoAdmin.Installation['status'];

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