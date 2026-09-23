import mysql, { type Pool } from "mysql2/promise";
import type { DatabaseProvider } from "../../database-provider.interface";
import { DATABASE_CATALOG } from "../../database.catalog";
import type {
    DbConnectionData,
    MySqlConnectionConfig,
} from "./mysql.provider.types";
import { envConfig } from "../../../config/env";
import { logger } from "../../../shared/logger";
import { MySqlDatabaseExecutor } from "./mysql.executor";
import type {
    DatabaseCommandResult,
    DatabaseConnection,
    DatabaseExecutor,
} from "../../database-executor.interface";
import { MySqlDatabaseConnection } from "./mysql.connection";
import type {
    DatabaseConnectionCheckResult,
    DatabaseConnectionConfig,
    MySqlDatabaseConnectionConfig,
} from "../../database-connection.types";

export class MySqlDatabaseProvider implements DatabaseProvider<"mysql"> {
    readonly type = "mysql";
    readonly descriptor = DATABASE_CATALOG.mysql;
    private pool: Pool | null = null;

    private parseConnectionConfig(): MySqlConnectionConfig | null {
        const host = process.env.Auto_Admin__DB_HOST;
        const port = process.env.Auto_Admin__DB_PORT;
        const user = process.env.Auto_Admin__DB_USERNAME;
        const password = process.env.Auto_Admin__DB_PASSWORD;
        const database = process.env.Auto_Admin__DB_DATABASE;
        const parsedPort = Number(port);

        if (
            !host ||
            !port ||
            !user ||
            password === undefined ||
            !database ||
            !Number.isInteger(parsedPort) ||
            parsedPort < 1 ||
            parsedPort > 65535
        )
            return null;

        return {
            host,
            port: parsedPort,
            user,
            password,
            database,
        };
    }

    getConnectionConfig(): DatabaseConnectionConfig<"mysql"> {
        const config = this.parseConnectionConfig();
        if (!config)
            throw new Error("Missing or invalid database connection data");
        return {
            ...config,
            type: "mysql",
        };
    }

    getPool(): Pool {
        if (this.pool) {
            return this.pool;
        }

        const { host, port, user, password, database } =
            this.getConnectionConfig();

        try {
            this.pool = mysql.createPool({
                host,
                port,
                user,
                password,
                database,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                connectTimeout: envConfig.Auto_Admin__DB_CONNECT_TIMEOUT_MS,
                supportBigNumbers: true,
                bigNumberStrings: false,
            });

            return this.pool;
        } catch (error) {
            const safeError =
                error instanceof Error
                    ? {
                          name: error.name,
                          message: error.message,
                          code:
                              "code" in error ? String(error.code) : undefined,
                      }
                    : { type: typeof error };
            logger.error(
                { error: safeError, service: "database-pool" },
                "Failed to create database pool",
            );
            throw error;
        }
    }

    async resetPool(): Promise<void> {
        return this.close();
    }

    async queryRows<TRow = unknown>(
        sql: string,
        params?: readonly unknown[],
    ): Promise<TRow[]> {
        const pool = this.getPool();
        const executor = new MySqlDatabaseExecutor(pool);
        return executor.queryRows<TRow>(sql, params);
    }

    async execute(
        sql: string,
        params?: readonly unknown[],
    ): Promise<DatabaseCommandResult> {
        const pool = this.getPool();
        const executor = new MySqlDatabaseExecutor(pool);
        return executor.execute(sql, params);
    }

    async withConnection<T>(
        callback: (connection: DatabaseConnection) => Promise<T>,
    ): Promise<T> {
        const pool = this.getPool();
        const connection = await pool.getConnection();

        try {
            return await callback(new MySqlDatabaseConnection(connection));
        } finally {
            connection.release();
        }
    }

    async transaction<T>(
        callback: (executor: DatabaseExecutor) => Promise<T>,
    ): Promise<T> {
        return this.withConnection((connection) =>
            connection.transaction(callback),
        );
    }

    async close(): Promise<void> {
        if (!this.pool) {
            return;
        }

        const pool = this.pool;
        this.pool = null;
        await pool.end();
    }

    hasCompleteConfig(): boolean {
        return this.parseConnectionConfig() !== null;
    }

    async checkConnection({
        host,
        port,
        user,
        password,
        database,
    }: MySqlDatabaseConnectionConfig): Promise<DatabaseConnectionCheckResult> {
        let connection: mysql.Connection | null = null;

        try {
            connection = await mysql.createConnection({
                host,
                port,
                user,
                password,
                database,
                connectTimeout: envConfig.Auto_Admin__DB_CONNECT_TIMEOUT_MS,
            });

            const version = await this.getVersion(
                new MySqlDatabaseExecutor(connection),
            );

            return { version };
        } catch (error) {
            const safeError =
                error instanceof Error
                    ? {
                          name: error.name,
                          message: error.message,
                          code:
                              "code" in error ? String(error.code) : undefined,
                      }
                    : { type: typeof error };
            logger.warn(
                { error: safeError, service: "mysql-database-provider" },
                "Failed to check database connection",
            );
            throw error;
        } finally {
            await connection?.end();
        }
    }

    async getVersion(executor: DatabaseExecutor): Promise<string> {
        const rows = await executor.queryRows<{ version: string }>(
            "SELECT VERSION() as version",
        );
        if (!rows[0]) throw new Error("Failed to get database version");

        return rows[0].version;
    }
}

export const mysqlDatabaseProvider = new MySqlDatabaseProvider();
