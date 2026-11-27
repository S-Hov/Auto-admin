import { executeRequestSchema, pipelineRequestSchema } from '@auto-admin/contracts/query';
import { invalidQuery } from '../../../core/query-engine/query-engine.errors';
export function parseExecuteRequest(input: unknown) {
    const parsed = executeRequestSchema.safeParse(input);
    if (!parsed.success)
        throw invalidQuery(
            "Unsupported query API version or invalid request envelope",
            parsed.error,
        );
    return parsed.data;
}
export function parsePipelineRequest(input: unknown) {
    const parsed = pipelineRequestSchema.safeParse(input);
    if (!parsed.success)
        throw invalidQuery(
            "Unsupported query API version or invalid request envelope",
            parsed.error,
        );
    return parsed.data;
}
