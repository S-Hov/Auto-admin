import { MySqlCompiler } from "./compiler/mysql.compiler";
import type { QueryResult } from "./drivers/driver.types";
import { MySqlDriver } from "./drivers/mysql.driver";
import type { UnifiedQuery } from "./types/query.types";

export class QueryEngineService {
    async execute<T = unknown>(query: UnifiedQuery): Promise<QueryResult<T>> {
        const compiled = MySqlCompiler.compile(query);
        const driver = new MySqlDriver;
        const result = await driver.execute<T>(compiled);

        return result;
    }
}