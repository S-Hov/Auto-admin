import type { QueryResult } from '@auto-admin/contracts/query';
// Состояние исполнителя не является публичным API-контрактом.
export interface PipelineExecutionContext<T = unknown> { steps: Record<string, QueryResult<T>>; }
