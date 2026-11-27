import type { z } from 'zod';
import type {
    createQuerySchema,
    deleteQuerySchema,
    fieldConditionSchema,
    queryEngineSchema,
    readQuerySchema,
    updateQuerySchema,
} from './query.schema';

// Transport types follow the runtime schemas. Refinements (limits, identifiers,
// etc.) still require runtime parsing.
export type ReadQuery = z.infer<typeof readQuerySchema>;
export type CreateQuery = z.infer<typeof createQuerySchema>;
export type UpdateQuery = z.infer<typeof updateQuerySchema>;
export type DeleteQuery = z.infer<typeof deleteQuerySchema>;
export type UnifiedQuery = z.infer<typeof queryEngineSchema>;
export type QueryAction = UnifiedQuery['action'];
export type SortClause = NonNullable<ReadQuery['sort']>[number];
export type JoinClause = NonNullable<ReadQuery['joins']>[number];
export type JoinAction = NonNullable<JoinClause['type']>;
export type FieldCondition = z.infer<typeof fieldConditionSchema>;
export type ComparisonOperator = keyof FieldCondition;

// The lazy WHERE schema needs an explicit recursive type. Field conditions
// are inferred above; the index also includes the recursive logical branches.
export type LogicalOperators = {
    _and?: WhereClause[];
    _or?: WhereClause[];
    _not?: WhereClause;
};

export type WhereClause = LogicalOperators & {
    [field: string]: FieldCondition | WhereClause[] | WhereClause | undefined;
};
