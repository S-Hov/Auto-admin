import { withTransaction } from "../../../db";
import { MySqlCompiler } from "../compiler/mysql.compiler";
import type { DatabaseDriver, QueryResult } from "../drivers/driver.types";
import { MySqlDriver } from "../drivers/mysql.driver";
import { ContextResolver } from "./context.resolver";
import type { PipelineDefinition, PipelineExecutionContext, PipelineResult, PipelineStep } from "./pipeline.types";

export class PipelineExecutor {
    constructor(private driver: DatabaseDriver = new MySqlDriver()) { }

    async execute<T>(definition: PipelineDefinition): Promise<PipelineResult<T>> {
        const startTime = performance.now();
        const context: PipelineExecutionContext<T> = { steps: {} };

        if (definition.transactional) {
            await withTransaction(async (transaction) => {
                const txDriver = new MySqlDriver(transaction);
                await this.runSteps(definition.steps, txDriver, context);
            });
        } else {
            await this.runSteps(definition.steps, this.driver, context);
        }

        const executionTimeMs = Math.round(performance.now() - startTime);

        return {
            success: true,
            steps: context.steps,
            executionTimeMs
        };
    }

    private async runSteps<T>(
        steps: PipelineStep[],
        driver: DatabaseDriver,
        context: PipelineExecutionContext<T>
    ): Promise<void> {
        for (const step of steps) {
            if (step.dependsOn) {
                for (const depId of step.dependsOn) {
                    if (!context.steps[depId]) {
                        throw new Error(`Step "${step.id}" depends on unexecuted step "${depId}"`);
                    }
                }
            }

            const resolvedQuery = ContextResolver.resolveQuery(step.query, context);
            const compiled = MySqlCompiler.compile(resolvedQuery);
            const result = await driver.execute(compiled);
            context.steps[step.id] = result as QueryResult<T>;
        }
    }
}