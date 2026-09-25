import type { DatabaseDriver, QueryResult } from "./driver.types";
import { DatabaseExecutor } from "../../../db/contracts/executor.interface";
import { CompiledQuery } from "../types/compiled-query.types";

export class MySqlDriver implements DatabaseDriver {
    constructor(private readonly executor: DatabaseExecutor) {}

    async execute<T = unknown>(query: CompiledQuery): Promise<QueryResult<T>> {
        let rows: T[] = [];
        let affectedRows = 0;
        let insertId: number | string | null = null;

        if (query.resultType === "rows") {
            const result = await this.executor.queryRows<T[]>(
                query.sql,
                query.params,
            );
            if (Array.isArray(result)) {
                rows = result as T[];
                affectedRows = result.length;
                insertId = null;

                return {
                    rows,
                    affectedRows,
                    insertId,
                };
            } else {
                throw new Error("Unknown query result type");
            }
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
