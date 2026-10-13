import type { z } from 'zod';
import type { bootstrapStageSchema, bootstrapStatusSchema } from './bootstrap.schema';

export type BootstrapStage = z.infer<typeof bootstrapStageSchema>;
export type BootstrapStatusResponse = z.infer<typeof bootstrapStatusSchema>;
