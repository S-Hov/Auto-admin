import type {
    DatabaseConnectionCheckResult,
    DatabaseConnectionConfig,
} from "./database-connection.types";
import type {
    DatabaseConnection,
    DatabaseExecutor,
} from "./database-executor.interface";
import type { DatabaseDescriptor, DatabaseType } from "./database.types";

export interface DatabaseProvider<
    TDatabaseType extends DatabaseType = DatabaseType,
> extends DatabaseExecutor {
    readonly type: TDatabaseType;
    readonly descriptor: DatabaseDescriptor;

    withConnection<T>(
        callback: (connection: DatabaseConnection) => Promise<T>,
    ): Promise<T>;

    transaction<T>(
        callback: (executor: DatabaseExecutor) => Promise<T>,
    ): Promise<T>;

    close(): Promise<void>;

    getConnectionConfig(): DatabaseConnectionConfig<TDatabaseType>;

    hasCompleteConfig(): boolean;

    checkConnection(configuration: DatabaseConnectionConfig<TDatabaseType>): Promise<DatabaseConnectionCheckResult>;
}
