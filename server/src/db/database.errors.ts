import { ERROR_CODES } from "../shared/api/codes/error-codes";

export class UnsupportedDatabaseError extends Error {
    readonly status: number;
    readonly code: string;

    constructor(databaseType: string) {
        super(`Database ${databaseType} is not supported`);
        this.status = 501;
        this.code = ERROR_CODES.UNSUPPORTED_DATABASE;
    }
}

export class UnsupportedDatabaseSubsystemError extends Error {
    readonly status: number;
    readonly code: string;

    constructor(databaseType: string, subsystem: string) {
        super(`Database ${databaseType} subsystem ${subsystem} is not supported`);
        this.status = 501;
        this.code = ERROR_CODES.UNSUPPORTED_DATABASE_SUBSYSTEM;
    }
}