import { getPool, withTransaction } from "../../db";
import { MySqlCompiler } from "./compiler/mysql.compiler";
import type { DatabaseDriver, QueryResult } from "./drivers/driver.types";
import { MySqlDriver } from "./drivers/mysql.driver";
import type { UnifiedQuery } from "./types/query.types";

export class QueryEngineService {
    constructor(private driver: DatabaseDriver = new MySqlDriver()) { }

    async execute<T = unknown>(query: UnifiedQuery): Promise<QueryResult<T>>;

    async execute<T = unknown>(query: UnifiedQuery[]): Promise<QueryResult<T>[]>;

    async execute<T = unknown>(query: UnifiedQuery | UnifiedQuery[]): Promise<QueryResult<T> | QueryResult<T>[]> {
        if (Array.isArray(query)) {
            return await withTransaction(async (transaction) => {
                const result: QueryResult<T>[] = [];
                const txDriver = new MySqlDriver(transaction);
                for (const c of query) {
                    const compiled = MySqlCompiler.compile(c);
                    result.push(await txDriver.execute<T>(compiled))
                }
                return result;
            })
        }
        else {
            const compiled = MySqlCompiler.compile(query);
            return await this.driver.execute<T>(compiled);
        }
    }

    async ping(): Promise<boolean> {
        return await this.driver.ping();
    }

    async close(): Promise<void> {
        return await this.driver.close();
    }
}