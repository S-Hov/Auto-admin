import type { CompiledQuery } from "../types/compiled-query.types";
import type { QueryResult } from "@auto-admin/contracts/query";

export interface DatabaseDriver {
    execute<T = unknown>(query: CompiledQuery): Promise<QueryResult<T>>;
    ping(): Promise<boolean>;
}
