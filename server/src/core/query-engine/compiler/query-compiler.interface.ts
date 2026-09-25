import type { CompiledQuery } from "../types/compiled-query.types";
import type { UnifiedQuery } from "../types/query.types";

export interface QueryCompiler {
    compile(query: UnifiedQuery): CompiledQuery;
}
