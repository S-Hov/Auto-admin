import { PAGE_ROWS_QUERY_LIMITS, pageRowsQuerySchema } from '@auto-admin/contracts/pages';
import { describe, expect, it } from 'vitest';

describe('pageRowsQuerySchema', () => {
    it.each([
        ['  Иван  ', 'Иван'],
        ['', ''],
        [' \t\n ', ''],
        ['Иван Петров', 'Иван Петров'],
        ['  ' + 'я'.repeat(200) + '  ', 'я'.repeat(200)],
    ])('normalizes search %j to %j', (search, normalized) => {
        expect(pageRowsQuerySchema.parse({ search })).toEqual({ offset: 0, search: normalized });
    });
    it.each([201, 257])('rejects search of %i characters after trimming', (length) => {
        expect(pageRowsQuerySchema.safeParse({ search: ' ' + 'я'.repeat(length) + ' ' }).success).toBe(false);
    });
    it.each([null, 123, ['Иван'], { text: 'Иван' }])('rejects non-string search: %j', (search) => {
        expect(pageRowsQuerySchema.safeParse({ search }).success).toBe(false);
    });
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
