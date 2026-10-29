import { describe, expect, it } from 'vitest';
import { pageData, pageCatalog } from '../../../../tests/fixtures/page.fixture';
import { createReadonlyCatalog } from '../../../core/schema-catalog/cache/schema-catalog.cache';
import { mapPageListRows } from './map-page-list-rows';

function fixture() {
    const config = pageData().config;
    config.fields[0].id = 'orderTotal';
    config.list.columns = ['orderTotal'];
    config.list.sorting.allowed = ['orderTotal'];
    return { config, catalog: pageCatalog() };
}

describe('mapPageListRows', () => {
    it.each([1500, 0, false, '', null, '9007199254740993'])('preserves the value %j under its config ID', (value) => {
        const { config, catalog } = fixture();
        expect(mapPageListRows(config, catalog, [{ total: value, internal_note: 'private' }])).toEqual([{ orderTotal: value }]);
    });
    it('resolves mappings even when there are no result rows', () => {
        const { config, catalog } = fixture();
        expect(mapPageListRows(config, catalog, [])).toEqual([]);
        config.list.columns = ['unknown'];
        expect(() => mapPageListRows(config, catalog, [])).toThrow();
    });
    it('copies one database value into two configured columns in their list order', () => {
        const { config, catalog } = fixture();
        config.fields.push({ ...config.fields[0], id: 'totalCopy' });
        config.list.columns = ['totalCopy', 'orderTotal'];
        const [row] = mapPageListRows(config, catalog, [{ total: 12 }]);
        expect(row).toEqual({ totalCopy: 12, orderTotal: 12 });
        expect(Object.keys(row)).toEqual(['totalCopy', 'orderTotal']);
    });
    it('does not require detail-only values and does not expose extra values', () => {
        const { config, catalog } = fixture();
        config.fields.push({ id: 'note', fieldId: 4, label: 'Note', display: { type: 'text' } });
        expect(mapPageListRows(config, catalog, [{ total: 50, internal_note: 'private', id: 1 }])).toEqual([{ orderTotal: 50 }]);
    });
    it.each([{}, { total: undefined }, Object.create({ total: 100 }) as Record<string, unknown>])('rejects a missing, undefined or inherited result column', (row) => {
        const { config, catalog } = fixture();
        expect(() => mapPageListRows(config, catalog, [row])).toThrow('missing an expected column');
    });
    it.each(['missing', 'foreign', 'deleted'])('rejects a %s catalog field', (scenario) => {
        const { config, catalog } = fixture();
        const field = catalog.fields.find((field) => field.id === 3)!;
        if (scenario === 'missing') catalog.fields = [];
        if (scenario === 'foreign') field.resourceId = 2;
        if (scenario === 'deleted') field.state = 'missing';
        expect(() => mapPageListRows(config, catalog, [{ total: 5 }])).toThrowError(expect.objectContaining({
            status: 400, code: 'COMMON.VALIDATION_FAILED',
            details: [{ field: 'config.list.columns.0', code: 'PAGE.FIELD_UNAVAILABLE' }],
        }));
    });
    it('does not mutate config, readonly catalog or frozen source rows', () => {
        const { config, catalog } = fixture();
        const before = structuredClone(config);
        const source = Object.freeze({ total: 15 });
        const rows = Object.freeze([source]);
        const [mapped] = mapPageListRows(config, createReadonlyCatalog(catalog), rows);
        expect(mapped).toEqual({ orderTotal: 15 });
        expect(mapped).not.toBe(source);
        expect(source).toEqual({ total: 15 });
        expect(config).toEqual(before);
    });
    it('handles special own property names without assigning to the object prototype', () => {
        const { config, catalog } = fixture();
        config.fields[0].id = 'constructor';
        config.list.columns = ['constructor'];
        catalog.fields.find((field) => field.id === 3)!.name = '__proto__';
        const [mapped] = mapPageListRows(config, catalog, [JSON.parse('{"__proto__":5}')]);
        expect(Object.hasOwn(mapped, 'constructor')).toBe(true);
        expect(mapped.constructor).toBe(5);
        expect(Object.getPrototypeOf(mapped)).toBe(Object.prototype);
    });
});
