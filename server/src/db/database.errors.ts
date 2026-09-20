export class UnsupportedDatabaseError extends Error {
    constructor(databaseName: string) {
        super(`Database ${databaseName} is not supported`);
    }    
}