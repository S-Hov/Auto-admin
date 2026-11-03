import { z } from "zod";

export const QUERY_API_VERSION = 1;
export const executeRequestSchema = z.strictObject({
    version: z.literal(QUERY_API_VERSION),
    query: z.unknown(),
});
export const pipelineRequestSchema = z.strictObject({
    version: z.literal(QUERY_API_VERSION),
    pipeline: z.unknown(),
});
