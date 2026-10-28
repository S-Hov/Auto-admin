import { describe, expect, it } from 'vitest';
import { getPageSchema } from './page-get.schema';

describe('getPageSchema', () => {
    it.each(['1', '42', String(Number.MAX_SAFE_INTEGER)])('parses a canonical URL ID: %s', (id) => {
        expect(getPageSchema.parse({ id })).toEqual({ id: Number(id) });
    });

    it.each(['0', '-1', '1.5', '1e2', '0x10', '01', '+1', ' 1 ', '', 'abc', '9007199254740992'])(
        'rejects a noncanonical or unsafe URL ID: %s', (id) => {
            expect(getPageSchema.safeParse({ id }).success).toBe(false);
        },
    );

    it('rejects missing and unknown parameters', () => {
        expect(getPageSchema.safeParse({}).success).toBe(false);
        expect(getPageSchema.safeParse({ id: '42', userId: '1' }).success).toBe(false);
    });
});
