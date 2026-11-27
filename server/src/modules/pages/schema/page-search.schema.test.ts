import { describe, expect, it } from 'vitest';
import { pageSearchFieldSchema, pageSearchSchema } from '@auto-admin/contracts/pages';

describe('pageSearchSchema', () => {
    it.each(['exact', 'contains', 'startsWith'] as const)('accepts the %s mode', (mode) => {
        const input = { fields: [{ fieldId: 101, mode }] };
        expect(pageSearchSchema.parse(input)).toEqual(input);
    });

    it.each([1, 10])('accepts %i distinct fields without mutating the input', (count) => {
        const input = { fields: Array.from({ length: count }, (_, index) => ({ fieldId: index + 1, mode: 'exact' })) };
        const before = structuredClone(input);
        expect(pageSearchSchema.parse(input)).toEqual(before);
        expect(input).toEqual(before);
    });

    it.each([0, 11])('rejects %i fields', (count) => {
        expect(pageSearchSchema.safeParse({
            fields: Array.from({ length: count }, (_, index) => ({ fieldId: index + 1, mode: 'exact' })),
        }).success).toBe(false);
    });

    it('rejects repeated field IDs even when the modes differ, at the duplicate path', () => {
        const result = pageSearchSchema.safeParse({ fields: [
            { fieldId: 101, mode: 'exact' },
            { fieldId: 102, mode: 'exact' },
            { fieldId: 101, mode: 'contains' },
        ] });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues).toEqual(expect.arrayContaining([
                expect.objectContaining({ path: ['fields', 2, 'fieldId'] }),
            ]));
        }
    });

    it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '101', null])('rejects an invalid catalog ID: %j', (fieldId) => {
        expect(pageSearchFieldSchema.safeParse({ fieldId, mode: 'exact' }).success).toBe(false);
    });

    it('accepts the largest safe catalog ID', () => {
        expect(pageSearchFieldSchema.safeParse({ fieldId: Number.MAX_SAFE_INTEGER, mode: 'exact' }).success).toBe(true);
    });

    it.each([
        {},
        { fields: null },
        { fields: [{ fieldId: 101 }] },
        { fields: [{ fieldId: 101, mode: 'like' }] },
        { fields: [{ fieldId: 101, mode: 'exact', column: 'name' }] },
        { fields: [{ fieldId: 101, mode: 'exact' }], enabled: true },
    ])('rejects incomplete or unsupported settings: %j', (input) => {
        expect(pageSearchSchema.safeParse(input).success).toBe(false);
    });
});
