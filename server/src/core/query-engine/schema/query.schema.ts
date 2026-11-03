import { queryEngineSchema, pipelineDefinitionSchema, MAX_QUERY_BATCH } from '@auto-admin/contracts/query';
import type { UnifiedQuery } from '../types/query.types';
import type { PipelineDefinition } from '../pipeline/pipeline.types';
import { invalidQuery } from '../query-engine.errors';
export { queryEngineSchema, MAX_QUERY_BATCH, MAX_PIPELINE_STEPS, MAX_READ_ROWS, DEFAULT_READ_ROWS } from '@auto-admin/contracts/query';

export function parseUnifiedQuery(input: unknown): UnifiedQuery {
    const result = queryEngineSchema.safeParse(input);
    if (!result.success)
        throw invalidQuery("Invalid query structure", result.error);
    return result.data;
}

export function parseQueryBatch(input: unknown): UnifiedQuery[] {
    if (
        !Array.isArray(input) ||
        input.length === 0 ||
        input.length > MAX_QUERY_BATCH
    ) {
        throw invalidQuery(
            "A query batch must contain between 1 and 20 commands",
        );
    }
    return input.map(parseUnifiedQuery);
}

export function parsePipeline(input: unknown): PipelineDefinition {
    const result = pipelineDefinitionSchema.safeParse(input);
    if (!result.success)
        throw invalidQuery("Invalid pipeline structure", result.error);
    const definition = {
        ...result.data,
        steps: result.data.steps.map((step) => ({
            ...step,
            query: parseUnifiedQuery(step.query),
        })),
    };
    if (
        !definition.transactional &&
        definition.steps.some((step) => step.query.action !== "read")
    ) {
        throw invalidQuery("Pipelines containing writes must be transactional");
    }
    return definition;
}
