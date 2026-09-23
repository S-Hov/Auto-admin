import type {
    DatabaseConnection,
    DatabaseExecutor,
} from "./database-executor.interface";
import type { DatabaseDescriptor, DatabaseType } from "./database.types";

export interface DatabaseProvider extends DatabaseExecutor {
    readonly type: DatabaseType;
    readonly descriptor: DatabaseDescriptor;

    withConnection<T>(
        callback: (connection: DatabaseConnection) => Promise<T>,
    ): Promise<T>;

    transaction<T>(
        callback: (executor: DatabaseExecutor) => Promise<T>,
    ): Promise<T>;

    close(): Promise<void>;
}
