import { describe, expect, it } from 'vitest';
import { menuResolveParamsSchema, menuResolveIdParamsSchema, menuResolveResponseSchema } from '@auto-admin/contracts/menu';

import { pageData } from './fixtures/page.fixture';

describe('menu resolution contract', () => {
    it('parses a canonical menu ID and requires a complete page response', () => {
        expect(menuResolveIdParamsSchema.parse({ id: '7' })).toEqual({ id: 7 });
        expect(menuResolveResponseSchema.safeParse({ success: true, code: 'COMMON.OK', data: { pageId: 42 } }).success).toBe(false);
    });
    it.each(['orders', 'sales-orders_2026', '0', 'a'.repeat(150)])('accepts a canonical slug: %s', (slug) => {
        expect(menuResolveParamsSchema.parse({ slug })).toEqual({ slug });
    });
    it.each(['', 'A', '-orders', '_orders', 'sales/orders', '../orders', ' orders ', 'a'.repeat(151)])(
        'rejects invalid slug: %s', (slug) => {
            expect(menuResolveParamsSchema.safeParse({ slug }).success).toBe(false);
        },
    );
    it('rejects unknown params and requires the slug', () => {
        expect(menuResolveParamsSchema.safeParse({}).success).toBe(false);
        expect(menuResolveParamsSchema.safeParse({ slug: 'orders', id: 42 }).success).toBe(false);
    });
    it.each([1, Number.MAX_SAFE_INTEGER])('accepts a safe page ID: %s', (pageId) => {
        expect(menuResolveResponseSchema.parse({ success: true, code: 'COMMON.OK', data: { ...pageData(), revision: 3, pageId } }).data).toEqual({ ...pageData(), revision: 3, pageId });
    });
    it.each([0, -1, 1.5, '42', null, Number.MAX_SAFE_INTEGER + 1])('rejects invalid page ID: %s', (pageId) => {
        expect(menuResolveResponseSchema.safeParse({ success: true, code: 'COMMON.OK', data: { ...pageData(), revision: 3, pageId } }).success).toBe(false);
    });
});
