import type { DatabaseProvider } from "../../db/contracts/provider.interface";
import { databaseRuntime } from "../../db/runtime/database.runtime";
import type { DatabaseDriver } from "./contracts/database-driver.interface";
import type { QueryEngineProvider } from "./contracts/query-engine-provider.interface";
import { PipelineExecutor } from "./pipeline/pipeline.executor";
import type {
    PipelineDefinition,
    PipelineResult,
} from "./pipeline/pipeline.types";
import { getActiveQueryEngineProvider } from "./runtime/query-engine.runtime";
import type { QueryResult } from "./types/query-result.types";
import type { UnifiedQuery } from "./types/query.types";

export class QueryEngineService {
    constructor(
        private readonly configuredDatabaseProvider?: DatabaseProvider,
        private readonly configuredQueryEngineProvider?: QueryEngineProvider,
    ) {}

    private resolveProviders(): {
        databaseProvider: DatabaseProvider;
        queryEngineProvider: QueryEngineProvider;
    } {
        return {
            databaseProvider:
                this.configuredDatabaseProvider ?? databaseRuntime.getProvider(),
            queryEngineProvider:
                this.configuredQueryEngineProvider ??
                getActiveQueryEngineProvider(),
        };
    }

    async execute<T = unknown>(query: UnifiedQuery): Promise<QueryResult<T>>;

    async execute<T = unknown>(
        query: UnifiedQuery[],
    ): Promise<QueryResult<T>[]>;

    async execute<T = unknown>(
        query: UnifiedQuery | UnifiedQuery[],
    ): Promise<QueryResult<T> | QueryResult<T>[]> {
        const { databaseProvider, queryEngineProvider } =
            this.resolveProviders();

        if (Array.isArray(query)) {
            return databaseProvider.transaction(async (executor) => {
                const driver = queryEngineProvider.createDriver(executor);
                const results: QueryResult<T>[] = [];

                for (const command of query) {
                    const compiled =
                        queryEngineProvider.compiler.compile(command);
                    results.push(await driver.execute<T>(compiled));
                }

                return results;
            });
        }

        const compiled = queryEngineProvider.compiler.compile(query);
        const driver = queryEngineProvider.createDriver(databaseProvider);
        return driver.execute<T>(compiled);
    }

    async ping(): Promise<boolean> {
        const { databaseProvider, queryEngineProvider } =
            this.resolveProviders();
        return queryEngineProvider.createDriver(databaseProvider).ping();
    }

    async executePipeline<T = unknown>(
        definition: PipelineDefinition,
    ): Promise<PipelineResult<T>> {
        const { databaseProvider, queryEngineProvider } =
            this.resolveProviders();
        return new PipelineExecutor(
            databaseProvider,
            queryEngineProvider,
        ).execute<T>(definition);
    }
}
