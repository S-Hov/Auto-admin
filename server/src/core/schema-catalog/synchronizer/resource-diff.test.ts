import { describe, it, expect } from 'vitest';
import { buildResourceDiff } from './resource-diff';
import type { DBTable, StoredResource } from '../types/schema-catalog.types';

const createMockTable = (overrides: Partial<DBTable> = {}): DBTable => ({
    name: 'test_table',
    type: 'table',
    engine: 'InnoDB',
    columns: [],
    primaryKey: null,
    uniqueKeys: [],
    foreignKeys: [],
    isServiceTable: false,
    comment: null,
    indexes: [],
    ...overrides,
});

const createMockStoredResource = (overrides: Partial<StoredResource> = {}): StoredResource => ({
    id: 1,
    schemaName: 'test_schema',
    tableName: 'test_table',
    type: 'table',
    engine: 'InnoDB',
    comment: null,
    isServiceTable: false,
    state: 'present',
    firstSeenScanId: 1,
    lastSeenScanId: 1,
    ...overrides,
});

describe('buildResourceDiff', () => {
    it('1. Новый ресурс: попадает в diff.added', () => {
        const newTable = createMockTable({ name: 'new_table' });

        const diff = buildResourceDiff([newTable], []);

        expect(diff.added).toEqual([newTable]);
        expect(diff.changed).toEqual([]);
        expect(diff.unchanged).toEqual([]);
        expect(diff.missing).toEqual([]);
    });

    it('2. Ресурс без изменений: попадает в diff.unchanged', () => {
        const table = createMockTable({ name: 'users' });
        const stored = createMockStoredResource({ tableName: 'users', state: 'present' });

        const diff = buildResourceDiff([table], [stored]);

        expect(diff.unchanged).toEqual([{ snapshot: table, stored }]);
        expect(diff.added).toEqual([]);
        expect(diff.changed).toEqual([]);
        expect(diff.missing).toEqual([]);
    });

    describe('3. Изменение одного свойства ресурса: попадает в diff.changed', () => {
        it('изменение type (table -> view)', () => {
            const table = createMockTable({ name: 'report', type: 'view' });
            const stored = createMockStoredResource({ tableName: 'report', type: 'table' });

            const diff = buildResourceDiff([table], [stored]);

            expect(diff.changed).toEqual([{ snapshot: table, stored }]);
            expect(diff.unchanged).toEqual([]);
            expect(diff.added).toEqual([]);
            expect(diff.missing).toEqual([]);
        });

        it('изменение engine (InnoDB -> MyISAM)', () => {
            const table = createMockTable({ name: 'logs', engine: 'MyISAM' });
            const stored = createMockStoredResource({ tableName: 'logs', engine: 'InnoDB' });

            const diff = buildResourceDiff([table], [stored]);

            expect(diff.changed).toEqual([{ snapshot: table, stored }]);
            expect(diff.unchanged).toEqual([]);
            expect(diff.added).toEqual([]);
            expect(diff.missing).toEqual([]);
        });

        it('изменение comment (null -> новое описание)', () => {
            const table = createMockTable({ name: 'users', comment: 'Users table' });
            const stored = createMockStoredResource({ tableName: 'users', comment: null });

            const diff = buildResourceDiff([table], [stored]);

            expect(diff.changed).toEqual([{ snapshot: table, stored }]);
            expect(diff.unchanged).toEqual([]);
            expect(diff.added).toEqual([]);
            expect(diff.missing).toEqual([]);
        });

        it('изменение isServiceTable (false -> true)', () => {
            const table = createMockTable({ name: 'Auto_Admin__settings', isServiceTable: true });
            const stored = createMockStoredResource({ tableName: 'Auto_Admin__settings', isServiceTable: false });

            const diff = buildResourceDiff([table], [stored]);

            expect(diff.changed).toEqual([{ snapshot: table, stored }]);
            expect(diff.unchanged).toEqual([]);
            expect(diff.added).toEqual([]);
            expect(diff.missing).toEqual([]);
        });
    });

    it('4. Исчезновение present-ресурса: попадает в diff.missing', () => {
        const stored = createMockStoredResource({ tableName: 'old_table', state: 'present' });

        const diff = buildResourceDiff([], [stored]);

        expect(diff.missing).toEqual([stored]);
        expect(diff.added).toEqual([]);
        expect(diff.changed).toEqual([]);
        expect(diff.unchanged).toEqual([]);
    });

    it('5. Уже missing ресурс всё ещё отсутствует: не попадает в diff.missing и игнорируется', () => {
        const stored = createMockStoredResource({ tableName: 'previously_deleted', state: 'missing' });

        const diff = buildResourceDiff([], [stored]);

        expect(diff.missing).toEqual([]);
        expect(diff.added).toEqual([]);
        expect(diff.changed).toEqual([]);
        expect(diff.unchanged).toEqual([]);
    });

    it('6. Возвращение ранее missing ресурса: попадает в diff.changed', () => {
        const table = createMockTable({ name: 'restored_table' });
        const stored = createMockStoredResource({ tableName: 'restored_table', state: 'missing' });

        const diff = buildResourceDiff([table], [stored]);

        expect(diff.changed).toEqual([{ snapshot: table, stored }]);
        expect(diff.added).toEqual([]);
        expect(diff.unchanged).toEqual([]);
        expect(diff.missing).toEqual([]);
    });

    it('7. Смешанный набор со всеми категориями одновременно', () => {
        const tableNew = createMockTable({ name: 'table_new' });
        const tableUnchanged = createMockTable({ name: 'table_unchanged' });
        const tableChanged = createMockTable({ name: 'table_changed', comment: 'Updated comment' });
        const tableRestored = createMockTable({ name: 'table_restored' });

        const storedUnchanged = createMockStoredResource({ id: 1, tableName: 'table_unchanged', state: 'present' });
        const storedChanged = createMockStoredResource({ id: 2, tableName: 'table_changed', comment: 'Old comment', state: 'present' });
        const storedRestored = createMockStoredResource({ id: 3, tableName: 'table_restored', state: 'missing' });
        const storedDisappeared = createMockStoredResource({ id: 4, tableName: 'table_disappeared', state: 'present' });
        const storedStillMissing = createMockStoredResource({ id: 5, tableName: 'table_still_missing', state: 'missing' });

        const snapshotTables = [tableNew, tableUnchanged, tableChanged, tableRestored];
        const storedResources = [storedUnchanged, storedChanged, storedRestored, storedDisappeared, storedStillMissing];

        const diff = buildResourceDiff(snapshotTables, storedResources);

        expect(diff.added).toEqual([tableNew]);
        expect(diff.unchanged).toEqual([{ snapshot: tableUnchanged, stored: storedUnchanged }]);
        expect(diff.changed).toEqual([
            { snapshot: tableChanged, stored: storedChanged },
            { snapshot: tableRestored, stored: storedRestored },
        ]);
        expect(diff.missing).toEqual([storedDisappeared]);
    });
});
