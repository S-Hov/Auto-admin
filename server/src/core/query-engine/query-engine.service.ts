import type { DatabaseProvider } from "../../db/contracts/provider.interface";
import { activeDatabaseProvider } from "../../db/runtime/database.runtime";
import type { DatabaseDriver, QueryResult } from "./drivers/driver.types";
import { PipelineExecutor } from "./pipeline/pipeline.executor";
import type {
    PipelineDefinition,
    PipelineResult,
} from "./pipeline/pipeline.types";
import type { QueryEngineProvider } from "./providers/query-engine-provider.interface";
import { activeQueryEngineProvider } from "./runtime/query-engine.runtime";
import type { UnifiedQuery } from "./types/query.types";

export class QueryEngineService {
    private readonly driver: DatabaseDriver;
    private readonly pipelineExecutor: PipelineExecutor;

    constructor(
        private readonly databaseProvider: DatabaseProvider = activeDatabaseProvider,
        private readonly queryEngineProvider: QueryEngineProvider = activeQueryEngineProvider,
    ) {
        this.driver = queryEngineProvider.createDriver(databaseProvider);
        this.pipelineExecutor = new PipelineExecutor(
            databaseProvider,
            queryEngineProvider,
        );
    }

    async execute<T = unknown>(query: UnifiedQuery): Promise<QueryResult<T>>;

    async execute<T = unknown>(
        query: UnifiedQuery[],
    ): Promise<QueryResult<T>[]>;

    async execute<T = unknown>(
        query: UnifiedQuery | UnifiedQuery[],
    ): Promise<QueryResult<T> | QueryResult<T>[]> {
        if (Array.isArray(query)) {
            return this.databaseProvider.transaction(async (executor) => {
                const driver = this.queryEngineProvider.createDriver(executor);
                const results: QueryResult<T>[] = [];

                for (const command of query) {
                    const compiled =
                        this.queryEngineProvider.compiler.compile(command);
                    results.push(await driver.execute<T>(compiled));
                }

                return results;
            });
        }

        const compiled = this.queryEngineProvider.compiler.compile(query);
        return this.driver.execute<T>(compiled);
    }

    async ping(): Promise<boolean> {
        return this.driver.ping();
    }

    async executePipeline<T = unknown>(
        definition: PipelineDefinition,
    ): Promise<PipelineResult<T>> {
        return this.pipelineExecutor.execute<T>(definition);
    }
}
