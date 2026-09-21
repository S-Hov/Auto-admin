export class UnsupportedDatabaseError extends Error {
    readonly status: number;
    readonly code: string;

    constructor(databaseName: string) {
        super(`Database ${databaseName} is not supported`);
        this.status = 501;
        this.code = 'UNSUPPORTED_DATABASE';
    }
}

export class UnsupportedDatabaseSubsystemError extends Error {
    readonly status: number;
    readonly code: string;

    constructor(subsystem: string) {
        super(`Database subsystem ${subsystem} is not supported`);
        this.status = 501;
        this.code = 'UNSUPPORTED_DATABASE_SUBSYSTEM';
    }
}