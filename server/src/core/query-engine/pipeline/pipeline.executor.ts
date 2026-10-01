import type { DatabaseProvider } from "../../../db/contracts/provider.interface";
import type { DatabaseDriver } from "../contracts/database-driver.interface";
import type { QueryEngineProvider } from "../contracts/query-engine-provider.interface";
import type { QueryResult } from "../types/query-result.types";
import { ContextResolver } from "./context.resolver";
import type {
    PipelineDefinition,
    PipelineExecutionContext,
    PipelineResult,
    PipelineStep,
} from "./pipeline.types";
import type {
    AccessPrincipal,
    PreparedAccessContext,
} from "../../access-control";
import { QueryAuthorizer } from "../access/query-authorizer";
import { parsePipeline } from "../schema/query.schema";
import { validatePipelineReferences } from "./pipeline.references";
import { assertQueryResultSize } from "../access/query-result.guard";

export class PipelineExecutor {
    constructor(
        private readonly databaseProvider: DatabaseProvider,
        private readonly queryEngineProvider: QueryEngineProvider,
        private readonly authorizer: QueryAuthorizer = new QueryAuthorizer(),
    ) {}

    async execute<T>(
        input: unknown,
        principal: AccessPrincipal,
    ): Promise<PipelineResult<T>> {
        const definition = parsePipeline(input);
        validatePipelineReferences(definition);
        const prepared = await this.authorizer.prepare(
            definition.steps.map((step) => step.query),
            principal,
        );
        definition.steps = definition.steps.map((step, index) => ({
            ...step,
            query: prepared.queries[index],
        }));
        if (definition.transactional)
            this.authorizer.assertTransactionalWrites(
                prepared.queries,
                prepared.context,
                this.queryEngineProvider,
            );
        const startTime = performance.now();
        const context: PipelineExecutionContext<T> = {
            steps: Object.create(null),
        };

        if (definition.transactional) {
            await this.databaseProvider.transaction(async (executor) => {
                const driver = this.queryEngineProvider.createDriver(executor);
                await this.runSteps(
                    definition.steps,
                    driver,
                    context,
                    prepared.context,
                );
            });
        } else {
            const driver = this.queryEngineProvider.createDriver(
                this.databaseProvider,
            );
            await this.runSteps(
                definition.steps,
                driver,
                context,
                prepared.context,
            );
        }

        const executionTimeMs = Math.round(performance.now() - startTime);

        return {
            success: true,
            steps: context.steps,
            executionTimeMs,
        };
    }

    private async runSteps<T>(
        steps: PipelineStep[],
        driver: DatabaseDriver,
        context: PipelineExecutionContext<T>,
        accessContext: PreparedAccessContext,
    ): Promise<void> {
        for (const step of steps) {
            if (step.dependsOn) {
                for (const depId of step.dependsOn) {
                    if (!context.steps[depId]) {
                        throw new Error(
                            `Step "${step.id}" depends on unexecuted step "${depId}"`,
                        );
                    }
                }
            }

            const resolvedQuery = ContextResolver.resolveQuery(
                step.query,
                context,
            );
            const validatedQuery = this.authorizer.validate(
                resolvedQuery,
                accessContext,
            );
            const compiled =
                this.queryEngineProvider.compiler.compile(validatedQuery);
            const result = await driver.execute(compiled);
            context.steps[step.id] = result as QueryResult<T>;
            assertQueryResultSize(context.steps);
        }
    }
}
