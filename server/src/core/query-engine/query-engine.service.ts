import { MySqlCompiler } from "./compiler/mysql.compiler";
import type { DatabaseDriver, QueryResult } from "./drivers/driver.types";
import { MySqlDriver } from "./drivers/mysql.driver";
import type { UnifiedQuery } from "./types/query.types";

export class QueryEngineService {
    constructor(private driver: DatabaseDriver = new MySqlDriver()) {}

    async execute<T = unknown>(query: UnifiedQuery): Promise<QueryResult<T>> {
        const compiled = MySqlCompiler.compile(query);
        return await this.driver.execute<T>(compiled);
    }

    async ping(): Promise<boolean> {
        return await this.driver.ping();
    }

    async close(): Promise<void> {
        return await this.driver.close();
    }
}