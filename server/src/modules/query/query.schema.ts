import { z } from "zod";
import { invalidQuery } from "../../core/query-engine/query-engine.errors";

export const QUERY_API_VERSION = 1;
const executeRequestSchema = z.strictObject({
    version: z.literal(QUERY_API_VERSION),
    query: z.unknown(),
});
const pipelineRequestSchema = z.strictObject({
    version: z.literal(QUERY_API_VERSION),
    pipeline: z.unknown(),
});

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
