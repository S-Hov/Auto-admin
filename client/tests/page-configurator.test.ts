import { describe, expect, it } from 'vitest';
import type { CatalogResource } from '@auto-admin/contracts/schema-catalog';
import { buildPageData, createFieldDrafts } from '../src/features/page-configurator/model/build-page-config';

const resource: CatalogResource = {
    id: 10, schemaName: 'shop', tableName: 'orders', type: 'table', comment: null, isSystem: false,
    fields: [
        { id: 101, name: 'id', dataType: 'int', nullable: false, allowedDisplays: ['text', 'number'] },
        { id: 102, name: 'total', dataType: 'decimal', nullable: false, allowedDisplays: ['text', 'number'] },
        { id: 103, name: 'photo', dataType: 'varchar', nullable: true, allowedDisplays: ['text', 'image', 'link'] },
        { id: 104, name: 'payload', dataType: 'json', nullable: true, allowedDisplays: [] },
    ],
    recordKeys: [{ name: 'PRIMARY', fieldIds: [101] }],
};
function draft() {
    return { resource, name: ' Заказы ', description: '', fields: createFieldDrafts(resource), keyName: 'PRIMARY', pageSize: 25, sortFieldId: 102, sortDirection: 'desc' as const };
}
describe('page configurator model', () => {
    it('creates safe initial formats and does not select unsupported fields', () => {
        expect(createFieldDrafts(resource).map(field => [field.selected, field.display])).toEqual([[true, 'number'], [true, 'number'], [true, 'text'], [false, 'text']]);
    });
    it('builds a valid config with stable IDs, key and sorting', () => {
        const result = buildPageData(draft());
        expect(result.name).toBe('Заказы');
        expect(result.description).toBeNull();
        expect(result.config.source).toEqual({ resourceId: 10, recordKey: [101] });
        expect(result.config.list.columns).toEqual(['field_101', 'field_102', 'field_103']);
        expect(result.config.list.sorting.default).toEqual([{ field: 'field_102', direction: 'desc' }]);
    });
    it('preserves chosen order and labels, omits unselected fields', () => {
        const input = draft();
        input.fields = [input.fields[2], { ...input.fields[1], label: ' Сумма ' }];
        const result = buildPageData(input);
        expect(result.config.list.columns).toEqual(['field_103', 'field_102']);
        expect(result.config.fields[1].label).toBe('Сумма');
    });
    it('supports a list without a record key', () => {
        expect(buildPageData({ ...draft(), keyName: '', sortFieldId: null }).config.source.recordKey).toBeNull();
    });
    it('rejects system resources, empty columns, invalid display and missing key', () => {
        expect(() => buildPageData({ ...draft(), resource: { ...resource, isSystem: true } })).toThrow();
        expect(() => buildPageData({ ...draft(), fields: [] })).toThrow();
        expect(() => buildPageData({ ...draft(), keyName: 'removed' })).toThrow();
        const input = draft();
        input.fields[0].display = 'image';
        expect(() => buildPageData(input)).toThrow();
    });
});
