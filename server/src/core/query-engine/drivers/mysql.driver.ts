import { CompiledQuery } from "../compiler/mysql.compiler";
import type { DatabaseDriver } from "./driver.types";
import type { QueryResult, PoolConnection, ResultSetHeader } from "mysql2/promise"

export class MySqlDriver implements DatabaseDriver {
    private pool: PoolConnection;

    constructor(pool: PoolConnection) {
        this.pool = pool;
    }

    async execute<T = unknown>(query: CompiledQuery): Promise<QueryResult<T>> {
        const result = this.pool.query(query.sql, query.params);
        let rows: T[] = [];
        let affectedRows = 0;
        let insertId: number | string | null = null;

        if (Array.isArray(result)) {
            rows = result as T[];
            affectedRows = rows.length;
            insertId = null;
        } else {
            rows = []
            affectedRows = (result as ResultSetHeader).affectedRows
            insertId = (result as ResultSetHeader).insertId
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
        await this.pool.end();
    }
}