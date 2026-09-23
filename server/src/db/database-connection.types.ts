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

export type DatabaseConnectionConfig<T extends DatabaseType = DatabaseType> =
    DatabaseConnectionConfigMap[T];

export type DatabaseConnectionConfigMap = {
    mysql: MySqlDatabaseConnectionConfig;
    postgresql: PostgreSqlDatabaseConnectionConfig;
    sqlite: SqliteDatabaseConnectionConfig;
};

export interface DatabaseConnectionCheckResult {
    version: string;
}
