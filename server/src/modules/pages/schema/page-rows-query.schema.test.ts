import { describe, expect, it } from 'vitest';
import { pageRowsQuerySchema, PAGE_ROWS_QUERY_LIMITS } from './page-rows-query.schema';

describe('pageRowsQuerySchema', () => {
    it('defaults to the first page without replacing page-config defaults', () => {
        expect(pageRowsQuerySchema.parse({})).toEqual({ offset: 0 });
    });
    it('permits offsets beyond the maximum page size', () => {
        expect(pageRowsQuerySchema.parse({ limit: 25, offset: 500 })).toEqual({ limit: 25, offset: 500 });
        expect(pageRowsQuerySchema.safeParse({ offset: PAGE_ROWS_QUERY_LIMITS.maxOffset }).success).toBe(true);
    });
    it.each([
        { limit: 0 }, { limit: -1 }, { limit: 101 }, { limit: 1.5 }, { limit: '25' },
        { offset: -1 }, { offset: 1.5 }, { offset: PAGE_ROWS_QUERY_LIMITS.maxOffset + 1 },
        { offset: '0' }, { sort: {} }, { sort: { field: '', direction: 'asc' } },
        { sort: { field: 'total', direction: 'up' } }, { sort: { field: 'a'.repeat(65), direction: 'asc' } },
        { unknown: 1 },
    ])('rejects invalid parameters: %j', (input) => {
        expect(pageRowsQuerySchema.safeParse(input).success).toBe(false);
    });
});
