import { pageRowsHttpQuerySchema } from '@auto-admin/contracts/pages';
import { describe, expect, it } from 'vitest';

describe('pageRowsHttpQuerySchema', () => {
    it('passes normalized search through the transform together with pagination and sorting', () => {
        expect(pageRowsHttpQuerySchema.parse({
            search: '  Иван & 50%_  ', limit: '25', offset: '50', sortField: 'total', sortDirection: 'desc',
        })).toEqual({ search: 'Иван & 50%_', limit: 25, offset: 50, sort: { field: 'total', direction: 'desc' } });
    });
    it.each(['', ' \t\n '])('accepts blank search %j', (search) => {
        expect(pageRowsHttpQuerySchema.parse({ search })).toEqual({ offset: 0, search: '' });
    });
    it('accepts 1000 raw characters when the trimmed search is within the limit', () => {
        expect(pageRowsHttpQuerySchema.parse({ search: ' '.repeat(800) + 'я'.repeat(200) }))
            .toEqual({ offset: 0, search: 'я'.repeat(200) });
    });
    it.each([' '.repeat(1001), ' '.repeat(1000) + 'я'])('rejects excessive raw length before trimming: case %#', (search) => {
        expect(pageRowsHttpQuerySchema.safeParse({ search }).success).toBe(false);
    });
    it('applies the internal search length limit after the HTTP transform', () => {
        expect(pageRowsHttpQuerySchema.safeParse({ search: 'я'.repeat(201) }).success).toBe(false);
    });
    it.each([123, null, ['Иван', 'Пётр'], { text: 'Иван' }])('rejects non-string HTTP search: %j', (search) => {
        expect(pageRowsHttpQuerySchema.safeParse({ search }).success).toBe(false);
    });
    it('keeps page-config defaults available when HTTP parameters are absent', () => {
        expect(pageRowsHttpQuerySchema.parse({})).toEqual({ offset: 0 });
    });
    it('converts flat HTTP parameters to internal numeric parameters and sort', () => {
        expect(pageRowsHttpQuerySchema.parse({ limit: '25', offset: '150', sortField: 'total', sortDirection: 'desc' }))
            .toEqual({ limit: 25, offset: 150, sort: { field: 'total', direction: 'desc' } });
    });
    it('allows the internal pagination boundaries', () => {
        expect(pageRowsHttpQuerySchema.parse({ limit: '100', offset: '100000' })).toEqual({ limit: 100, offset: 100000 });
    });
    it.each([
        { limit: '' }, { limit: '0' }, { limit: '-1' }, { limit: '101' }, { limit: '1.5' },
        { limit: '1e2' }, { limit: '0x10' }, { limit: ' 25' }, { limit: '01' }, { limit: 25 },
        { offset: '-1' }, { offset: '100001' }, { offset: '1.5' }, { offset: '' },
        { limit: ['10', '25'] }, { offset: {} },
        { sortField: 'total' }, { sortDirection: 'asc' },
        { sortField: '', sortDirection: 'asc' }, { sortField: 'a'.repeat(65), sortDirection: 'asc' },
        { sortField: 'total', sortDirection: 'ASC' }, { sortField: ['total', 'id'], sortDirection: 'asc' },
        { sort: { field: 'total', direction: 'asc' } }, { unknown: 'value' },
    ])('rejects malformed HTTP parameters: %j', (input) => {
        expect(pageRowsHttpQuerySchema.safeParse(input).success).toBe(false);
    });
    it('points to the missing member of a sorting pair', () => {
        const result = pageRowsHttpQuerySchema.safeParse({ sortField: 'total' });
        expect(result.success).toBe(false);
        if (!result.success) expect(result.error.issues[0].path).toEqual(['sortDirection']);
    });
});
