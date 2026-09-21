import type { DatabaseDescriptor, DatabaseType } from "./database.types";

export interface DatabaseProvider {
    readonly type: DatabaseType;
    readonly descriptor: DatabaseDescriptor;
}