import { DatabaseConnection } from "./database-executor.interface";
import type { DatabaseDescriptor, DatabaseType } from "./database.types";

export interface DatabaseProvider extends DatabaseConnection {
    readonly type: DatabaseType;
    readonly descriptor: DatabaseDescriptor;

    close(): Promise<void>;
}