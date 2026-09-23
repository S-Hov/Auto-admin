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
    DatabaseExecutor,
} from "../../database-executor.interface";
import { MySqlDatabaseConnection } from "./mysql.connection";
import { number } from "zod/v3";

export class MySqlDatabaseProvider implements DatabaseProvider {
    readonly type = "mysql";
    readonly descriptor = DATABASE_CATALOG.mysql;
    private pool: Pool | null = null;

    getConnectionConfig(): MySqlConnectionConfig {
        const host = process.env.Auto_Admin__DB_HOST;
        const port = process.env.Auto_Admin__DB_PORT;
        const user = process.env.Auto_Admin__DB_USERNAME;
        const password = process.env.Auto_Admin__DB_PASSWORD;
        const database = process.env.Auto_Admin__DB_DATABASE;

        if (!host || !port || !user || !database) {
            throw new Error("Missing database connection data");
        }

        return {
            host,
            port: Number(port),
            user,
            password: password || "",
            database,
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

    async transaction<T>(
        callback: (executor: DatabaseExecutor) => Promise<T>,
    ): Promise<T> {
        const pool = this.getPool();

        const connection = await pool.getConnection();

        try {
            const transaction = new MySqlDatabaseConnection(connection);
            return await transaction.transaction<T>(callback);
        } finally {
            connection?.release();
        }
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
        try {
            const { host, port, user, password, database } =
                this.getConnectionConfig();

            if (
                (password || password === "") &&
                Number.isInteger(port) &&
                port >= 0 &&
                port <= 65535
            ) {
                return true;
            }

            return false;
        } catch {
            return false;
        }
    }

    async checkConnection({
        host,
        port,
        database,
        user,
        password,
    }: DbConnectionData): Promise<{ version?: string }> {
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
