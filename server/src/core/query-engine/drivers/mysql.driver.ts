import { type DbExecutor, getPool } from "../../../db";
import { CompiledQuery } from "../compiler/mysql.compiler";
import type { DatabaseDriver, QueryResult } from "./driver.types";
import mysql from "mysql2/promise"

export class MySqlDriver implements DatabaseDriver {
    private pool: mysql.PoolConnection | mysql.Pool;

    constructor(pool: DbExecutor = getPool()) {
        this.pool = pool;
    }

    async execute<T = unknown>(query: CompiledQuery): Promise<QueryResult<T>> {
        const [result] = await this.pool.query(query.sql, query.params);
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
            await this.pool.query('SELECT 1');
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