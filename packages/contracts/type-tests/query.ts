import type {
    CreateQuery, DeleteQuery, FieldCondition, JoinAction, QueryAction,
    ReadQuery, UnifiedQuery, UpdateQuery, WhereClause,
} from '@auto-admin/contracts/query';

// Compiled by tsc, never executed. An unused @ts-expect-error fails the check
// if a public type starts accepting an unsupported request again.
declare function acceptQuery(query: UnifiedQuery): void;
acceptQuery({ action: 'read', table: 'orders', select: ['id'] });
acceptQuery({ action: 'create', table: 'orders', data: { total: 42, note: null } });
acceptQuery({ action: 'update', table: 'orders', data: { paid: true }, where: { id: { _eq: 1 } } });
acceptQuery({ action: 'delete', table: 'orders', where: { id: { _in: [1, 2] } } });

// @ts-expect-error select is required, even when selecting all fields
const missingSelect: ReadQuery = { action: 'read', table: 'orders' };
// @ts-expect-error connection is not supported by the read schema
const readConnection: ReadQuery = { action: 'read', table: 'orders', select: ['id'], connection: 'main' };
// @ts-expect-error returning is not supported by the create schema
const createReturning: CreateQuery = { action: 'create', table: 'orders', data: { id: 1 }, returning: ['id'] };
// @ts-expect-error connection is not supported by the update schema
const updateConnection: UpdateQuery = { action: 'update', table: 'orders', data: { id: 1 }, where: { id: { _eq: 1 } }, connection: 'main' };
// @ts-expect-error returning is not supported by the delete schema
const deleteReturning: DeleteQuery = { action: 'delete', table: 'orders', where: { id: { _eq: 1 } }, returning: ['id'] };
// @ts-expect-error OUTER JOIN is unsupported
const outerJoin: JoinAction = 'OUTER';
// @ts-expect-error aggregate is unsupported
const aggregate: QueryAction = 'aggregate';
// @ts-expect-error write values must be JSON scalars or null
const nestedData: CreateQuery = { action: 'create', table: 'orders', data: { nested: { id: 1 } } };
// @ts-expect-error _null accepts only true
const invalidNull: FieldCondition = { _null: false };
// @ts-expect-error _in accepts an array of scalars
const invalidIn: FieldCondition = { _in: 1 };
// @ts-expect-error WHERE entries cannot be arbitrary scalars
const invalidWhere: WhereClause = { id: 1 };

const recursiveWhere: WhereClause = {
    _and: [{ id: { _in: [1, 2] } }, { _not: { paid: { _eq: false } } }],
};
