import { RowDataPacket } from "mysql2";
import { AutoAdmin } from "../../db/db.types";

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