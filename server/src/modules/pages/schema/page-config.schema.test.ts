import { describe, expect, it } from 'vitest';
import { pageConfigSchema, PAGE_CONFIG_LIMITS, type PageConfig } from './page-config.schema';

function config(): PageConfig {
    return {
        schemaVersion: 1,
        source: { resourceId: 42, recordKey: [101] },
        fields: [
            { id: 'orderNumber', fieldId: 101, label: 'Номер заказа', display: { type: 'text' } },
            { id: 'total', fieldId: 102, label: 'Сумма', display: { type: 'number', fractionDigits: 2 } },
        ],
        list: {
            columns: ['orderNumber', 'total'],
            sorting: { allowed: ['orderNumber', 'total'], default: [{ field: 'orderNumber', direction: 'desc' }] },
            pagination: { defaultPageSize: 25, pageSizeOptions: [10, 25, 50] },
        },
        detail: { groups: [{ id: 'main', label: 'Основные данные', fields: ['orderNumber', 'total'] }] },
    };
}

describe('pageConfigSchema', () => {
    it('accepts the agreed first-version config without mutating it', () => {
        const input = config();
        const before = structuredClone(input);
        expect(pageConfigSchema.parse(input)).toEqual(before);
        expect(input).toEqual(before);
    });
    it('allows a list without a record key and details', () => {
        const input = config();
        input.source.recordKey = null;
        delete input.detail;
        expect(pageConfigSchema.safeParse(input).success).toBe(true);
    });
    it('allows composite keys and key fields not displayed on the page', () => {
        const input = config();
        input.source.recordKey = [201, 202];
        expect(pageConfigSchema.safeParse(input).success).toBe(true);
    });
    it.each([
        (c: PageConfig) => { c.fields.push({ ...c.fields[0] }); },
        (c: PageConfig) => { c.list.columns.push('missing'); },
        (c: PageConfig) => { c.list.columns.push('total'); },
        (c: PageConfig) => { c.list.sorting.allowed.push('missing'); },
        (c: PageConfig) => { c.list.sorting.allowed.push('total'); },
        (c: PageConfig) => { c.list.sorting.allowed = ['total']; },
        (c: PageConfig) => { c.list.sorting.default.push({ ...c.list.sorting.default[0] }); },
        (c: PageConfig) => { c.list.pagination.defaultPageSize = 30; },
        (c: PageConfig) => { c.list.pagination.pageSizeOptions.push(25); },
        (c: PageConfig) => { c.list.pagination.pageSizeOptions.push(PAGE_CONFIG_LIMITS.pageSize + 1); },
        (c: PageConfig) => { c.detail!.groups[0].fields.push('missing'); },
        (c: PageConfig) => { c.detail!.groups[0].fields.push('total'); },
        (c: PageConfig) => { c.detail!.groups.push({ ...c.detail!.groups[0] }); },
        (c: PageConfig) => { c.source.recordKey = null; },
        (c: PageConfig) => { c.source.recordKey = [101, 101]; },
        (c: PageConfig) => { c.source.recordKey = []; },
        (c: PageConfig) => { c.source.resourceId = 0; },
        (c: PageConfig) => { c.fields[0].fieldId = Number.MAX_SAFE_INTEGER + 1; },
        (c: PageConfig) => { c.fields[0].label = ' '; },
        (c: PageConfig) => { c.fields[0].id = 'invalid id'; },
        (c: PageConfig) => { c.fields = []; },
        (c: PageConfig) => { c.list.columns = []; },
        (c: PageConfig) => { c.fields[1].display = { type: 'number', fractionDigits: -1 }; },
    ])('rejects invalid configuration %#', (mutate) => {
        const input = config();
        mutate(input);
        expect(pageConfigSchema.safeParse(input).success).toBe(false);
    });
    it('rejects unknown versions, properties and display types', () => {
        expect(pageConfigSchema.safeParse({ ...config(), schemaVersion: 2 }).success).toBe(false);
        expect(pageConfigSchema.safeParse({ ...config(), userId: 1 }).success).toBe(false);
        const input = config();
        expect(pageConfigSchema.safeParse({ ...input, source: { ...input.source, sql: 'SELECT 1' } }).success).toBe(false);
        expect(pageConfigSchema.safeParse({ ...input, fields: [{ ...input.fields[0], display: { type: 'html' } }] }).success).toBe(false);
    });
    it('reports a broken reference at its exact path', () => {
        const input = config();
        input.list.columns[1] = 'missing';
        const result = pageConfigSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) expect(result.error.issues[0].path).toEqual(['list', 'columns', 1]);
    });
});
