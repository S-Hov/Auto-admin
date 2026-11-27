import { describe, expect, it } from 'vitest';
import { pageResolveParamsSchema } from '@auto-admin/contracts/pages';

describe('page lookup by navigation slug contract', () => {
    it.each(['orders', 'sales-orders_2026', '0', 'a'.repeat(150)])('accepts a canonical slug: %s', (slug) => {
        expect(pageResolveParamsSchema.parse({ slug })).toEqual({ slug });
    });
    it.each(['', 'A', '-orders', '_orders', 'sales/orders', '../orders', ' orders ', 'a'.repeat(151)])('rejects invalid slug: %s', (slug) => {
        expect(pageResolveParamsSchema.safeParse({ slug }).success).toBe(false);
    });
    it('requires slug and rejects unknown params', () => {
        expect(pageResolveParamsSchema.safeParse({}).success).toBe(false);
        expect(pageResolveParamsSchema.safeParse({ slug: 'orders', id: 42 }).success).toBe(false);
    });
});
