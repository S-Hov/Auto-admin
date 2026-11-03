import { z } from 'zod';
import { apiResponseSchema } from '../common';
import type { UnifiedQuery } from './query.types';
export interface QueryResult<T = unknown> { rows: T[]; affectedRows: number; insertId?: number | string | null; raw?: unknown; }
export interface PipelineStep { id: string; query: UnifiedQuery; dependsOn?: string[]; }
export interface PipelineDefinition { steps: PipelineStep[]; transactional?: boolean; }
export interface PipelineResult<T = unknown> { success: boolean; steps: Record<string, QueryResult<T>>; executionTimeMs?: number; }
export const queryResultSchema = z.looseObject({
 rows: z.array(z.unknown()), affectedRows: z.number().int().min(0),
 insertId: z.union([z.number(), z.string(), z.null()]).optional(), raw: z.unknown().optional(),
});
export const queryResponseSchema = apiResponseSchema(z.union([queryResultSchema, z.array(queryResultSchema)]));
export const pipelineResultSchema = z.looseObject({
 success: z.boolean(), steps: z.record(z.string(), queryResultSchema), executionTimeMs: z.number().min(0).optional(),
});
export const pipelineResponseSchema = apiResponseSchema(pipelineResultSchema);
