import {
    AccessControlService,
    accessControlService,
    type AccessPrincipal,
    type PreparedAccessContext,
} from "../../access-control";
import { analyzeQueryAccess } from "./query-access.analyzer";
import { parseUnifiedQuery } from "../schema/query.schema";
import type { UnifiedQuery } from "../types/query.types";
import { invalidQuery } from "../query-engine.errors";
import type { QueryEngineProvider } from "../contracts/query-engine-provider.interface";

export class QueryAuthorizer {
    constructor(
        private readonly access: AccessControlService = accessControlService,
    ) {}

    async prepare(
        inputs: readonly unknown[],
        principal: AccessPrincipal,
    ): Promise<{
        queries: UnifiedQuery[];
        context: PreparedAccessContext;
    }> {
        const parsed = inputs.map(parseUnifiedQuery);
        const context = await this.access.prepareContext(principal);
        const queries = parsed.map((query) => this.validate(query, context));
        return { queries, context };
    }

    validate(input: unknown, context: PreparedAccessContext): UnifiedQuery {
        const analyzed = analyzeQueryAccess(
            parseUnifiedQuery(input),
            context.catalog,
        );
        this.access.assertAuthorized(analyzed.requirements, context);
        return analyzed.query;
    }

    assertTransactionalWrites(
        queries: readonly UnifiedQuery[],
        context: PreparedAccessContext,
        provider: QueryEngineProvider,
    ): void {
        for (const query of queries) {
            if (query.action === "read") continue;
            const resource = context.catalog.resources.find(
                (item) =>
                    `${item.schemaName}.${item.tableName}` === query.table,
            );
            if (!resource || !provider.supportsTransactionalWrites(resource)) {
                throw invalidQuery(
                    "The target table does not support transactional writes",
                );
            }
        }
    }
}
