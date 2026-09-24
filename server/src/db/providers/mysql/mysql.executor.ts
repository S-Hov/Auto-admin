import type {
    DatabaseCommandResult,
    DatabaseExecutor,
} from "../../contracts/executor.interface";
import { envConfig } from "../../../config/env";
import type { MySqlDbExecutor } from "./mysql.types";

export class MySqlDatabaseExecutor implements DatabaseExecutor {
    protected readonly executor: MySqlDbExecutor;

    constructor(executor: MySqlDbExecutor) {
        this.executor = executor;
    }

    async queryRows<TRow = unknown>(
        sql: string,
        params?: readonly unknown[],
    ): Promise<TRow[]> {
        const sqlParams = !params || params.length === 0 ? [] : params;
        const [result] = await this.executor.query({
            sql,
            timeout: envConfig.Auto_Admin__DB_QUERY_TIMEOUT_MS,
            values: [...sqlParams],
        });
        if (!Array.isArray(result)) throw new Error("Invalid query result");
        return result as TRow[];
    }

    async execute(
        sql: string,
        params?: readonly unknown[],
    ): Promise<DatabaseCommandResult> {
        const sqlParams = !params || params.length === 0 ? [] : params;
        const [result] = await this.executor.query({
            sql,
            timeout: envConfig.Auto_Admin__DB_QUERY_TIMEOUT_MS,
            values: [...sqlParams],
        });

        if (Array.isArray(result)) throw new Error("Invalid query result");
        const insertId: number | null =
            result.insertId === 0 ? null : result.insertId;
        return {
            affectedRows: result.affectedRows,
            insertId,
        };
    }
}
