import type { DatabaseSubsystem, DatabaseType } from "./database.types";

export class UnsupportedDatabaseError extends Error {
    constructor(public readonly databaseType: DatabaseType) {
        super(`Database ${databaseType} is not supported`);
        this.name = "UnsupportedDatabaseError";
    }
}

export class UnsupportedDatabaseSubsystemError extends Error {
    constructor(
        public readonly databaseType: DatabaseType,
        public readonly databaseSubsystem: DatabaseSubsystem
    ) {
        super(`Database subsystem ${databaseSubsystem} is not supported for database ${databaseType}`);
        this.name = "UnsupportedDatabaseSubsystemError";
    }
}

export class DatabaseProviderNotFoundError extends Error {
    constructor(public readonly databaseType: DatabaseType) {
        super(`Database provider for ${databaseType} is not registered`);
        this.name = "DatabaseProviderNotFoundError";
    }
}
