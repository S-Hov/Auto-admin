import { describe, expect, it } from 'vitest';
import { pageData } from '../../../../tests/fixtures/page.fixture';
import { updatePageSchema } from './page-update.schema';

describe('updatePageSchema', () => {
    it('accepts a complete replacement and its expected revision', () => {
        const input = { ...pageData(), name: ' Заказы ', revision: 3 };
        expect(updatePageSchema.parse(input)).toEqual({ ...input, name: 'Заказы' });
        expect(input.revision).toBe(3);
    });

    it.each([undefined, null, 0, -1, 1.5, '3', Number.MAX_SAFE_INTEGER + 1])('rejects invalid expected revision %s', (revision) => {
        expect(updatePageSchema.safeParse({ ...pageData(), revision }).success).toBe(false);
    });

    it('rejects fields owned by the server and broken nested config', () => {
        expect(updatePageSchema.safeParse({ ...pageData(), revision: 3, updatedBy: 1 }).success).toBe(false);
        const input = { ...pageData(), revision: 3 };
        input.config.list.columns = ['missing'];
        expect(updatePageSchema.safeParse(input).success).toBe(false);
    });
});
