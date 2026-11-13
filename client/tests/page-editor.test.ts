import { describe, expect, it } from 'vitest';
import { pageConfigSchema, type PageConfig } from '@auto-admin/contracts/pages';
import { addColumn, removeColumn } from '../src/features/page-configurator/model/edit-page-config';

function config(): PageConfig {
    return {
        schemaVersion: 1, source: { resourceId: 1, recordKey: [10] },
        fields: [
            { id: 'id', fieldId: 10, label: 'ID', display: { type: 'number' } },
            { id: 'name', fieldId: 11, label: 'Имя', display: { type: 'text' } },
        ],
        list: { columns: ['id', 'name'], sorting: { allowed: ['id', 'name'], default: [{ field: 'name', direction: 'asc' }] },
            pagination: { defaultPageSize: 25, pageSizeOptions: [25, 50] } },
    };
}

describe('page editor config changes', () => {
    it('removes column references and sorting without mutating the saved config', () => {
        const saved = config();
        const next = removeColumn(saved, 'name');
        expect(pageConfigSchema.parse(next).list.columns).toEqual(['id']);
        expect(next.fields.map(field => field.id)).toEqual(['id']);
        expect(next.list.sorting).toEqual({ allowed: ['id'], default: [] });
        expect(saved.list.columns).toEqual(['id', 'name']);
        expect(saved.list.sorting.default).toHaveLength(1);
    });
    it('preserves fields used by detail groups, record key and unrelated settings', () => {
        const saved = config();
        saved.detail = { groups: [{ id: 'main', label: 'Карточка', fields: ['id', 'name'] }] };
        const next = removeColumn(saved, 'id');
        expect(pageConfigSchema.safeParse(next).success).toBe(true);
        expect(next.fields).toEqual(saved.fields);
        expect(next.detail).toEqual(saved.detail);
        expect(next.source.recordKey).toEqual([10]);
        expect(next.list.pagination).toEqual(saved.list.pagination);
    });
    it('can restore a detail-only column without duplicating its field or sort allowance', () => {
        const saved = config();
        saved.detail = { groups: [{ id: 'main', label: 'Карточка', fields: ['name'] }] };
        const restored = addColumn(removeColumn(saved, 'name'), saved.fields[1]);
        expect(pageConfigSchema.safeParse(restored).success).toBe(true);
        expect(restored.fields).toHaveLength(2);
        expect(restored.list.columns).toEqual(['id', 'name']);
        expect(restored.list.sorting.allowed).toEqual(['id', 'name']);
    });
    it('appends new columns while retaining existing display options', () => {
        const saved = config();
        saved.fields[0].display = { type: 'number', fractionDigits: 2 };
        const next = addColumn(saved, { id: 'created', fieldId: 12, label: 'Создан', display: { type: 'datetime' } });
        expect(pageConfigSchema.safeParse(next).success).toBe(true);
        expect(next.list.columns).toEqual(['id', 'name', 'created']);
        expect(next.fields[0].display).toEqual({ type: 'number', fractionDigits: 2 });
        expect(saved.fields).toHaveLength(2);
    });
});
