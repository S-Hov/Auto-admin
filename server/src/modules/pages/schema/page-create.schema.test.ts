import { describe, expect, it } from 'vitest';
import { pageData } from '../../../../tests/fixtures/page.fixture';
import { createPageSchema } from './page-create.schema';

describe('createPageSchema', () => {
    it('accepts a valid page and trims its name without changing the input', () => {
        const data = { ...pageData(), name: ' Заказы ' };
        expect(createPageSchema.parse(data)).toEqual({ ...data, name: 'Заказы' });
        expect(data.name).toBe(' Заказы ');
    });

    it('accepts a text description', () => {
        expect(createPageSchema.parse({ ...pageData(), description: 'Список заказов' }).description).toBe('Список заказов');
    });

    it.each([
        { name: ' ' }, { name: 'x'.repeat(101) }, { name: 42 },
        { description: undefined }, { description: 123 },
        { pageId: 42 }, { revision: 100 }, { createdBy: 7 },
    ])('rejects invalid fields or server-owned fields: %j', (changes) => {
        expect(createPageSchema.safeParse({ ...pageData(), ...changes }).success).toBe(false);
    });

    it('validates the nested config, including its internal references', () => {
        const data = pageData();
        data.config.list.columns = ['missing'];
        expect(createPageSchema.safeParse(data).success).toBe(false);
        expect(createPageSchema.safeParse({ ...pageData(), config: { schemaVersion: 2 } }).success).toBe(false);
    });
});
