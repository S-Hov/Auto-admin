import { z } from 'zod';
import { pageRowsQuerySchema } from './page-rows-query.schema';

export const pageRowsHttpQuerySchema = z.strictObject({
    limit: z.string().max(16).regex(/^[1-9]\d*$/).optional(),
    offset: z.string().max(16).regex(/^(0|[1-9]\d*)$/).optional(),
    sortField: z.string().min(1).max(64).optional(),
    sortDirection: z.enum(['asc', 'desc']).optional(),
}).superRefine((query, ctx) => {
    if ((query.sortField === undefined) !== (query.sortDirection === undefined)) {
        ctx.addIssue({
            code: 'custom',
            path: [query.sortField === undefined ? 'sortField' : 'sortDirection'],
            message: 'Both sorting parameters must be provided together',
        });
    }
}).transform((query) => ({
    ...(query.limit === undefined ? {} : { limit: Number(query.limit) }),
    ...(query.offset === undefined ? {} : { offset: Number(query.offset) }),
    ...(query.sortField !== undefined && query.sortDirection !== undefined
        ? { sort: { field: query.sortField, direction: query.sortDirection } }
        : {}),
})).pipe(pageRowsQuerySchema);
