import type { DatabaseType } from "./database.types";

export interface NetworkDatabaseConnectionConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}

export interface MySqlDatabaseConnectionConfig extends NetworkDatabaseConnectionConfig {
    type: "mysql";
}

export interface PostgreSqlDatabaseConnectionConfig extends NetworkDatabaseConnectionConfig {
    type: "postgresql";
}

export interface SqliteDatabaseConnectionConfig {
    type: "sqlite";
    filePath: string;
}

type AllConfigs =
    | MySqlDatabaseConnectionConfig
    | PostgreSqlDatabaseConnectionConfig
    | SqliteDatabaseConnectionConfig;

export type DatabaseConnectionConfig<T extends DatabaseType = DatabaseType> =
    Extract<DatabaseConnectionConfigMap, T>;

export type DatabaseConnectionConfigMap = {
    [K in DatabaseType]: Extract<AllConfigs, { type: K }>;
};

export interface DatabaseConnectionCheckResult {
    version: string;
}
