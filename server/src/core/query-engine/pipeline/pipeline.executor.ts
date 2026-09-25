import type { DatabaseProvider } from "../../../db/contracts/provider.interface";
import { activeDatabaseProvider } from "../../../db/runtime/database.runtime";
import type { DatabaseDriver } from "../contracts/database-driver.interface";
import type { QueryEngineProvider } from "../contracts/query-engine-provider.interface";
import { activeQueryEngineProvider } from "../runtime/query-engine.runtime";
import type { QueryResult } from "../types/query-result.types";
import { ContextResolver } from "./context.resolver";
import type {
    PipelineDefinition,
    PipelineExecutionContext,
    PipelineResult,
    PipelineStep,
} from "./pipeline.types";

export class PipelineExecutor {
    constructor(
        private readonly databaseProvider: DatabaseProvider = activeDatabaseProvider,
        private readonly queryEngineProvider: QueryEngineProvider = activeQueryEngineProvider,
    ) {}

    async execute<T>(
        definition: PipelineDefinition,
    ): Promise<PipelineResult<T>> {
        const startTime = performance.now();
        const context: PipelineExecutionContext<T> = { steps: {} };

        if (definition.transactional) {
            await this.databaseProvider.transaction(async (executor) => {
                const driver = this.queryEngineProvider.createDriver(executor);
                await this.runSteps(definition.steps, driver, context);
            });
        } else {
            const driver = this.queryEngineProvider.createDriver(
                this.databaseProvider,
            );
            await this.runSteps(definition.steps, driver, context);
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
            const compiled =
                this.queryEngineProvider.compiler.compile(resolvedQuery);
            const result = await driver.execute(compiled);
            context.steps[step.id] = result as QueryResult<T>;
        }
    }
}
