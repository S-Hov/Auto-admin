import { describe, it, expect } from 'vitest';
import { catalog, resource } from '../../../tests/fixtures/access.fixture';
import { presentCatalog } from './catalog-presenter';
import { catalogResponseSchema } from '@auto-admin/contracts/schema-catalog';

describe('public schema catalog', () => {
    it('includes system tables, hides missing/foreign resources and returns only public metadata', () => {
        const source = catalog();
        source.resources.push(resource(99, 'missing', { state: 'missing' }), resource(100, 'foreign', { schemaName: 'other' }));
        const result = presentCatalog(source);
        expect(catalogResponseSchema.safeParse({ success: true, code: 'COMMON.OK', data: result }).success).toBe(true);
        expect(result.resources.map(row => row.id)).not.toContain(99);
        expect(result.resources.map(row => row.id)).not.toContain(100);
        expect(result.resources.find(row => row.id === 3)?.isSystem).toBe(true);
        const field = result.resources[0].fields[0];
        expect(field).not.toHaveProperty('defaultValue');
        expect(field).not.toHaveProperty('generated');
        expect(field.allowedDisplays).toEqual(['text', 'number']);
    });
    it('offers only complete non-null unique column keys without prefixes/expressions', () => {
        const source = catalog();
        const base = { id: 1, resourceId: 1, name: 'PRIMARY', isUnique: true, indexType: 'BTREE', isVisible: true, comment: null, state: 'present' as const, firstSeenScanId: 1, lastSeenScanId: 1 };
        const part = { id: 1, indexId: 1, kind: 'column' as const, fieldId: 1, columnName: 'id', expression: null, position: 1, prefixLength: null, sortDirection: 'ASC' as const };
        source.indexes = [
            { ...base, parts: [part] },
            { ...base, name: 'prefixed', parts: [{ ...part, prefixLength: 2 }] },
            { ...base, name: 'nullable', parts: [{ ...part, fieldId: 2 }] },
            { ...base, name: 'missing', parts: [{ ...part, fieldId: 99 }] },
            { ...base, name: 'nonunique', isUnique: false, parts: [part] },
        ];
        source.fields[1].nullable = true;
        expect(presentCatalog(source).resources.find(row => row.id === 1)?.recordKeys).toEqual([{ name: 'PRIMARY', fieldIds: [1] }]);
    });
});
