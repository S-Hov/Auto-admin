import { describe, expect, it } from 'vitest';
import { pageListSchema } from './page-list.schema';

describe('pageListSchema', () => {
    it('uses bounded defaults for an empty query', () => {
        expect(pageListSchema.parse({})).toEqual({ q: '', limit: 25, offset: 0 });
    });

    it('trims search and parses pagination', () => {
        expect(pageListSchema.parse({ q: ' Заказы ', limit: '10', offset: '20' })).toEqual({ q: 'Заказы', limit: 10, offset: 20 });
    });

    it('accepts the documented upper bounds', () => {
        expect(pageListSchema.parse({ limit: '100', offset: '100000' })).toMatchObject({ limit: 100, offset: 100000 });
    });

    it.each([
        { limit: '0' }, { limit: '101' }, { limit: '-1' }, { limit: '1.5' },
        { limit: '1e2' }, { limit: '01' }, { limit: ['10', '20'] },
        { offset: '-1' }, { offset: '100001' }, { offset: '1.5' }, { offset: '0x10' },
        { offset: '01' }, { offset: ['0', '1'] },
        { q: 'x'.repeat(101) }, { q: ['first', 'second'] }, { q: { value: 'orders' } },
        { sort: 'config' },
    ])('rejects invalid or unknown query parameters: %j', (input) => {
        expect(pageListSchema.safeParse(input).success).toBe(false);
    });
});
