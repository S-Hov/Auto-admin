import type { DatabaseCommandResult, DatabaseExecutor } from "../../database-executor.interface";
import { envConfig } from "../../../config/env";
import type { MySqlDbExecuter } from "./mysql.types";
import { ResultSetHeader } from "mysql2";

export class MySqlDatabaseExecutor implements DatabaseExecutor{
    readonly pool: MySqlDbExecuter;

    constructor(pool: MySqlDbExecuter) {
        this.pool = pool;
    }

    async queryRows<TRow = unknown>(sql: string, params?: readonly unknown[]): Promise<TRow[]> {
        const sqlParams = !params || params.length === 0 ? [] : params;
        const [result] = await this.pool.query({
            sql,
            timeout: envConfig.Auto_Admin__DB_QUERY_TIMEOUT_MS,
            values: [...sqlParams]
        });
        if (!Array.isArray(result)) throw new Error ("Invalid query result")
        return result as TRow[];
    }

    async execute(sql: string, params?: readonly unknown[]): Promise<DatabaseCommandResult> {
        const sqlParams = !params || params.length === 0 ? [] : params;
        const [result] = await this.pool.query<ResultSetHeader>({
            sql,
            timeout: envConfig.Auto_Admin__DB_QUERY_TIMEOUT_MS,
            values: [...sqlParams]
        });

        if (!result) throw new Error("Invalid query result");
        const insertId: number | null = result.insertId === 0 ? null : result.insertId;
        return {
            affectedRows: result.affectedRows,
            insertId
        };
    }
}