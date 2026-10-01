import type { DatabaseProvider } from "../../db/contracts/provider.interface";
import { databaseRuntime } from "../../db/runtime/database.runtime";
import type { AccessPrincipal } from "../access-control";
import { QueryAuthorizer } from "./access/query-authorizer";
import { parseQueryBatch } from "./schema/query.schema";
import { assertQueryResultSize } from "./access/query-result.guard";
import type { QueryEngineProvider } from "./contracts/query-engine-provider.interface";
import { PipelineExecutor } from "./pipeline/pipeline.executor";
import type { PipelineResult } from "./pipeline/pipeline.types";
import { getActiveQueryEngineProvider } from "./runtime/query-engine.runtime";
import type { QueryResult } from "./types/query-result.types";
import type { UnifiedQuery } from "./types/query.types";

export class QueryEngineService {
    constructor(
        private readonly configuredDatabaseProvider?: DatabaseProvider,
        private readonly configuredQueryEngineProvider?: QueryEngineProvider,
        private readonly authorizer: QueryAuthorizer = new QueryAuthorizer(),
    ) {}

    private resolveProviders(): {
        databaseProvider: DatabaseProvider;
        queryEngineProvider: QueryEngineProvider;
    } {
        return {
            databaseProvider:
                this.configuredDatabaseProvider ??
                databaseRuntime.getProvider(),
            queryEngineProvider:
                this.configuredQueryEngineProvider ??
                getActiveQueryEngineProvider(),
        };
    }

    async execute<T = unknown>(
        query: UnifiedQuery,
        principal: AccessPrincipal,
    ): Promise<QueryResult<T>>;

    async execute<T = unknown>(
        query: UnifiedQuery[],
        principal: AccessPrincipal,
    ): Promise<QueryResult<T>[]>;

    async execute<T = unknown>(
        query: unknown,
        principal: AccessPrincipal,
    ): Promise<QueryResult<T> | QueryResult<T>[]>;

    async execute<T = unknown>(
        query: unknown,
        principal: AccessPrincipal,
    ): Promise<QueryResult<T> | QueryResult<T>[]> {
        const batch = Array.isArray(query);
        const inputs = batch ? parseQueryBatch(query) : [query];
        const { queries, context } = await this.authorizer.prepare(
            inputs,
            principal,
        );
        const { databaseProvider, queryEngineProvider } =
            this.resolveProviders();

        if (batch) {
            this.authorizer.assertTransactionalWrites(
                queries,
                context,
                queryEngineProvider,
            );
            return databaseProvider.transaction(async (executor) => {
                const driver = queryEngineProvider.createDriver(executor);
                const results: QueryResult<T>[] = [];

                for (const command of queries) {
                    const compiled =
                        queryEngineProvider.compiler.compile(command);
                    results.push(await driver.execute<T>(compiled));
                    assertQueryResultSize(results);
                }

                return results;
            });
        }

        const compiled = queryEngineProvider.compiler.compile(queries[0]);
        const driver = queryEngineProvider.createDriver(databaseProvider);
        const result = await driver.execute<T>(compiled);
        assertQueryResultSize(result);
        return result;
    }

    async ping(): Promise<boolean> {
        const { databaseProvider, queryEngineProvider } =
            this.resolveProviders();
        return queryEngineProvider.createDriver(databaseProvider).ping();
    }

    async executePipeline<T = unknown>(
        definition: unknown,
        principal: AccessPrincipal,
    ): Promise<PipelineResult<T>> {
        const { databaseProvider, queryEngineProvider } =
            this.resolveProviders();
        return new PipelineExecutor(
            databaseProvider,
            queryEngineProvider,
            this.authorizer,
        ).execute<T>(definition, principal);
    }
}

export const queryEngineService = new QueryEngineService();
