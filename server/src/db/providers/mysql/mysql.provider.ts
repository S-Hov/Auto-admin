import mysql, { Pool } from "mysql2/promise";
import type { DatabaseProvider } from "../../database-provider.interface";
import { assertDatabaseSubsystemSupported, assertDatabaseSupported, DATABASE_CATALOG } from "../../database.catalog";
import type { MySqlConnectionConfig } from "./mysql-provider.types";
import { envConfig } from "../../../config/env";
import { UnsupportedDatabaseError } from "../../database.errors";
import { logger } from "../../../shared/logger";

export class MySqlDatabaseProvider implements DatabaseProvider {
    readonly type = 'mysql';
    readonly descriptor = DATABASE_CATALOG.mysql;
    private pool: Pool | null = null;

    getConnectionConfig(): MySqlConnectionConfig {
        const host = process.env.Auto_Admin__DB_HOST;
        const port = process.env.Auto_Admin__DB_PORT;
        const user = process.env.Auto_Admin__DB_USERNAME;
        const password = process.env.Auto_Admin__DB_PASSWORD;
        const database = process.env.Auto_Admin__DB_DATABASE;

        if (!host || !port || !user || !database) {
            throw new Error('Missing database connection data');
        }

        return {
            host,
            port: Number(port),
            user,
            password: password || '',
            database,
        }
    }

    getPool(): Pool {
        const activeDB = envConfig.Auto_Admin__DB_TYPE;
        assertDatabaseSupported(activeDB);
        assertDatabaseSubsystemSupported(activeDB, 'connection');

        if (activeDB !== 'mysql') throw new UnsupportedDatabaseError(activeDB);

        if (this.pool) {
            return this.pool;
        }

        const { host, port, user, password, database } = this.getConnectionConfig();

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
        }
        catch (error) {
            const safeError = error instanceof Error
                ? { name: error.name, message: error.message, code: 'code' in error ? String(error.code) : undefined }
                : { type: typeof error };
            logger.error({ error: safeError, service: 'database-pool' }, 'Failed to create database pool');
            throw error;
        }
    }

    async resetPool() {
        if (!this.pool) {
            return;
        }

        await this.pool.end();
        this.pool = null;
    }
};

export const mysqlDatabaseProvider = new MySqlDatabaseProvider();