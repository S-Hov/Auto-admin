import { ERROR_CODES } from "../shared/api/codes/error-codes";
import type { DatabaseType } from "./database.types";

export class UnsupportedDatabaseError extends Error {
    public readonly databaseType: DatabaseType;
    readonly status: number;
    readonly code: string;

    constructor(databaseType: DatabaseType) {
        super(`Database ${databaseType} is not supported`);
        this.databaseType = databaseType;
        this.status = 501;
        this.code = ERROR_CODES.UNSUPPORTED_DATABASE;
    }
}

export class UnsupportedDatabaseSubsystemError extends Error {
    readonly databaseType: DatabaseType;
    readonly subsystem: string;
    readonly status: number;
    readonly code: string;

    constructor(databaseType: DatabaseType, subsystem: string) {
        super(`Database ${databaseType} subsystem ${subsystem} is not supported`);
        this.databaseType = databaseType;
        this.subsystem = subsystem;
        this.status = 501;
        this.code = ERROR_CODES.UNSUPPORTED_DATABASE_SUBSYSTEM;
    }
}

export class DatabaseProviderNotFoundError extends Error {
    public readonly databaseType: DatabaseType;

    constructor(databaseType: DatabaseType) {
        super(`Database provider for ${databaseType} is not registered`);
        this.databaseType = databaseType;
    }
}