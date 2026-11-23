import { describe, expect, it } from 'vitest';
import type { PageConfig } from '@auto-admin/contracts/pages';
import { readQuerySchema } from '@auto-admin/contracts/query';
import { catalog as makeCatalog, field } from '../../../../tests/fixtures/access.fixture';
import { buildPageSearchCondition } from './build-page-search-condition';

function fixture() {
    const catalog = makeCatalog();
    catalog.fields = [
        field(101, 1, '_or', { dataType: 'text', columnType: 'text' }),
        field(102, 1, 'comment', { dataType: 'text', columnType: 'text' }),
        field(103, 1, 'reference', { dataType: 'varchar', columnType: 'varchar(60)' }),
        field(104, 1, 'id'),
        field(105, 2, 'foreign_note', { dataType: 'text', columnType: 'text' }),
    ];
    const config: Pick<PageConfig, 'source' | 'search'> = { source: { resourceId: 1, recordKey: null } };
    return { config, catalog };
}

describe('buildPageSearchCondition', () => {
    it.each([undefined, ''])('omits a search condition for %j', (searchText) => {
        const { config, catalog } = fixture();
        expect(buildPageSearchCondition(config, catalog, searchText)).toBeUndefined();
    });

    it('rejects a search on a page without search settings', () => {
        const { config, catalog } = fixture();
        expect(() => buildPageSearchCondition(config, catalog, 'Иван')).toThrowError(expect.objectContaining({
            status: 400, details: [{ field: 'search', code: 'VALIDATION.INVALID_VALUE' }],
        }));
    });

    it('combines the three text modes with OR and passes literal input to the query engine', () => {
        const { config, catalog } = fixture();
        config.search = { fields: [
            { fieldId: 101, mode: 'exact' },
            { fieldId: 102, mode: 'contains' },
            { fieldId: 103, mode: 'startsWith' },
            { fieldId: 104, mode: 'exact' },
        ] };
        const text = 'Иван 50%_!';
        const result = buildPageSearchCondition(config, catalog, text);
        const where = { _or: [
            { 'orders._or': { _eq: text } },
            { 'orders.comment': { _contains: text } },
            { 'orders.reference': { _starts_with: text } },
        ] };
        expect(result).toEqual({ kind: 'where', where });
        expect(readQuerySchema.parse({
            action: 'read', table: 'shop.orders', select: ['id'],
            where: result?.kind === 'where' ? result.where : undefined,
        }).where).toEqual(where);
    });

    it('reports no match when nonempty text has no applicable condition', () => {
        const { config, catalog } = fixture();
        config.search = { fields: [{ fieldId: 104, mode: 'exact' }] };
        expect(buildPageSearchCondition(config, catalog, 'Иван')).toEqual({ kind: 'no-match' });
    });

    it.each([
        [999, 'exact', 'fieldId', 'PAGE.FIELD_UNAVAILABLE'],
        [105, 'exact', 'fieldId', 'PAGE.FIELD_RESOURCE_MISMATCH'],
        [104, 'contains', 'mode', 'PAGE.SEARCH_INCOMPATIBLE'],
    ] as const)('rejects invalid search settings for field %i and mode %s', (fieldId, mode, property, code) => {
        const { config, catalog } = fixture();
        config.search = { fields: [{ fieldId: 101, mode: 'exact' }, { fieldId, mode }] };
        expect(() => buildPageSearchCondition(config, catalog, 'Иван')).toThrowError(expect.objectContaining({
            status: 400, details: [{ field: `config.search.fields.1.${property}`, code }],
        }));
    });
});
