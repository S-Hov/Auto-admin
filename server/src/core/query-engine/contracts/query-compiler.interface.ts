import type { CompiledQuery } from "../types/compiled-query.types";
import type { UnifiedQuery } from "@auto-admin/contracts/query";

export interface QueryCompiler {
    compile(query: UnifiedQuery): CompiledQuery;
}
