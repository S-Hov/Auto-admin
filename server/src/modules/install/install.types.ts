import { RowDataPacket } from "mysql2";
import { AutoAdmin } from "../../db/db.types";

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

export type InstallationStatus = RowDataPacket &
    Pick<AutoAdmin.Installation, 'status'>

export type InstallationStatusValue =
    AutoAdmin.Installation['status'];