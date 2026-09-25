import type { DatabaseDriver, QueryResult } from "./driver.types";
import type { DatabaseExecutor } from "../../../db/contracts/executor.interface";
import type { CompiledQuery } from "../types/compiled-query.types";

export class MySqlDriver implements DatabaseDriver {
    constructor(private readonly executor: DatabaseExecutor) {}

    async execute<T = unknown>(query: CompiledQuery): Promise<QueryResult<T>> {
        if (query.resultType === "rows") {
            const result = await this.executor.queryRows<T>(
                query.sql,
                query.params,
            );

            return {
                rows: result,
                affectedRows: result.length,
                insertId: null,
            };
        } else if (query.resultType === "command") {
            const result = await this.executor.execute(query.sql, query.params);

            return {
                rows: [],
                affectedRows: result.affectedRows,
                insertId: result.insertId,
            };
        } else {
            throw new Error("Unknown query result type");
        }
    }

    async ping(): Promise<boolean> {
        try {
            await this.executor.queryRows("SELECT 1");
            return true;
        } catch {
            return false;
        }
    }
}
