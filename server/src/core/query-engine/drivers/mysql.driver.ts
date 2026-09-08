import { type DbExecutor, getPool } from "../../../db";
import { CompiledQuery } from "../compiler/mysql.compiler";
import type { DatabaseDriver, QueryResult } from "./driver.types";
import mysql from "mysql2/promise"
import { envConfig } from "../../../config/env";

export class MySqlDriver implements DatabaseDriver {
    private pool: mysql.PoolConnection | mysql.Pool;

    constructor(pool: DbExecutor = getPool()) {
        this.pool = pool;
    }

    async execute<T = unknown>(query: CompiledQuery): Promise<QueryResult<T>> {
        const [result] = await this.pool.query({
            sql: query.sql,
            timeout: envConfig.Auto_Admin__DB_QUERY_TIMEOUT_MS,
            values: query.params,
        });
        let rows: T[] = [];
        let affectedRows = 0;
        let insertId: number | string | null = null;

        if (Array.isArray(result)) {
            rows = result as T[];
            affectedRows = rows.length;
            insertId = null;
        } else {
            rows = []
            affectedRows = (result as mysql.ResultSetHeader).affectedRows
            insertId = (result as mysql.ResultSetHeader).insertId
        }

        return {
            rows,
            affectedRows,
            insertId
        }
    }

    async ping(): Promise<boolean> {
        try {
            await this.pool.query({
                sql: 'SELECT 1',
                timeout: envConfig.Auto_Admin__DB_QUERY_TIMEOUT_MS,
            });
            return true;
        }
        catch {
            return false;
        }
    }

    async close(): Promise<void> {
        if ('release' in this.pool && typeof this.pool.release === 'function') {
            this.pool.release();
        } else if ('end' in this.pool && typeof this.pool.end === 'function') {
            await this.pool.end();
        }
    }
}
