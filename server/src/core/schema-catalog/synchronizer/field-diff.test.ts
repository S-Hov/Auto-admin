import { describe, it, expect } from 'vitest';
import { buildFieldDiff } from './field-diff';
import type { DBColumn, DBTable, StoredField, StoredResource } from '../types/schema-catalog.types';

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

const createMockColumn = (overrides: Partial<DBColumn> = {}): DBColumn => ({
    name: 'test_col',
    position: 1,
    dataType: 'varchar',
    characterMaximumLength: 255,
    numericPrecision: null,
    numericScale: null,
    datetimePrecision: null,
    columnType: 'varchar(255)',
    nullable: false,
    defaultValue: null,
    generated: {
        isGenerated: false,
        generationExpression: null,
    },
    autoIncrement: false,
    extra: '',
    characterSetName: 'utf8mb4',
    collationName: 'utf8mb4_0900_ai_ci',
    comment: null,
    ...overrides,
});

const createMockStoredField = (overrides: Partial<StoredField> = {}): StoredField => ({
    ...createMockColumn(),
    id: 1,
    resourceId: 1,
    state: 'present',
    firstSeenScanId: 1,
    lastSeenScanId: 1,
    ...overrides,
});

describe('buildFieldDiff', () => {
    it('1. Поля совершенно новой таблицы → added', () => {
        const colId = createMockColumn({ name: 'id', position: 1 });
        const colName = createMockColumn({ name: 'title', position: 2 });
        const table = createMockTable({ name: 'articles', columns: [colId, colName] });

        const diff = buildFieldDiff([table], [], []);

        expect(diff.added).toEqual([
            { tableName: 'articles', column: colId },
            { tableName: 'articles', column: colName },
        ]);
        expect(diff.changed).toEqual([]);
        expect(diff.unchanged).toEqual([]);
        expect(diff.missing).toEqual([]);
    });

    it('2. У существующего ресурса ещё нет сохранённых полей → все его колонки added', () => {
        const colId = createMockColumn({ name: 'id', position: 1 });
        const colEmail = createMockColumn({ name: 'email', position: 2 });
        const table = createMockTable({ name: 'users', columns: [colId, colEmail] });
        const storedResource = createMockStoredResource({ id: 1, tableName: 'users' });

        const diff = buildFieldDiff([table], [storedResource], []);

        expect(diff.added).toEqual([
            { tableName: 'users', column: colId },
            { tableName: 'users', column: colEmail },
        ]);
        expect(diff.changed).toEqual([]);
        expect(diff.unchanged).toEqual([]);
        expect(diff.missing).toEqual([]);
    });

    it('3. Новая колонка существующей таблицы → added', () => {
        const colId = createMockColumn({ name: 'id' });
        const colPhone = createMockColumn({ name: 'phone' });
        const table = createMockTable({ name: 'users', columns: [colId, colPhone] });

        const storedResource = createMockStoredResource({ id: 1, tableName: 'users' });
        const storedId = createMockStoredField({ id: 10, resourceId: 1, name: 'id' });

        const diff = buildFieldDiff([table], [storedResource], [storedId]);

        expect(diff.added).toEqual([
            { tableName: 'users', column: colPhone },
        ]);
        expect(diff.unchanged).toEqual([
            { snapshot: colId, stored: storedId },
        ]);
        expect(diff.changed).toEqual([]);
        expect(diff.missing).toEqual([]);
    });

    it('4. Полностью совпадающее поле → unchanged', () => {
        const column = createMockColumn({ name: 'id' });
        const table = createMockTable({ name: 'users', columns: [column] });

        const storedResource = createMockStoredResource({ id: 1, tableName: 'users' });
        const storedField = createMockStoredField({ id: 10, resourceId: 1, name: 'id' });

        const diff = buildFieldDiff([table], [storedResource], [storedField]);

        expect(diff.unchanged).toEqual([
            { snapshot: column, stored: storedField },
        ]);
        expect(diff.added).toEqual([]);
        expect(diff.changed).toEqual([]);
        expect(diff.missing).toEqual([]);
    });

    describe('5. Изменение метаданных → changed (проверка каждого свойства hasFieldMetadataChanged по отдельности)', () => {
        const metadataCases: Array<{
            property: string;
            columnOverride: Partial<DBColumn>;
            fieldOverride: Partial<StoredField>;
        }> = [
            {
                property: 'dataType',
                columnOverride: { dataType: 'text', columnType: 'varchar(255)' },
                fieldOverride: { dataType: 'varchar', columnType: 'varchar(255)' },
            },
            {
                property: 'position',
                columnOverride: { position: 2 },
                fieldOverride: { position: 1 },
            },
            {
                property: 'characterMaximumLength',
                columnOverride: { characterMaximumLength: 100 },
                fieldOverride: { characterMaximumLength: 255 },
            },
            {
                property: 'numericPrecision',
                columnOverride: { numericPrecision: 10 },
                fieldOverride: { numericPrecision: null },
            },
            {
                property: 'numericScale',
                columnOverride: { numericScale: 2 },
                fieldOverride: { numericScale: null },
            },
            {
                property: 'datetimePrecision',
                columnOverride: { datetimePrecision: 6 },
                fieldOverride: { datetimePrecision: null },
            },
            {
                property: 'columnType',
                columnOverride: { columnType: 'varchar(100)' },
                fieldOverride: { columnType: 'varchar(255)' },
            },
            {
                property: 'nullable',
                columnOverride: { nullable: true },
                fieldOverride: { nullable: false },
            },
            {
                property: 'defaultValue',
                columnOverride: { defaultValue: 'active' },
                fieldOverride: { defaultValue: null },
            },
            {
                property: 'generated.isGenerated',
                columnOverride: { generated: { isGenerated: true, generationExpression: null } },
                fieldOverride: { generated: { isGenerated: false, generationExpression: null } },
            },
            {
                property: 'generated.generationExpression',
                columnOverride: { generated: { isGenerated: false, generationExpression: 'price * 2' } },
                fieldOverride: { generated: { isGenerated: false, generationExpression: null } },
            },
            {
                property: 'autoIncrement',
                columnOverride: { autoIncrement: true },
                fieldOverride: { autoIncrement: false },
            },
            {
                property: 'extra',
                columnOverride: { extra: 'auto_increment' },
                fieldOverride: { extra: '' },
            },
            {
                property: 'characterSetName',
                columnOverride: { characterSetName: 'latin1' },
                fieldOverride: { characterSetName: 'utf8mb4' },
            },
            {
                property: 'collationName',
                columnOverride: { collationName: 'utf8mb4_bin' },
                fieldOverride: { collationName: 'utf8mb4_0900_ai_ci' },
            },
            {
                property: 'comment',
                columnOverride: { comment: 'Updated description' },
                fieldOverride: { comment: null },
            },
        ];

        it.each(metadataCases)(
            'изменение только свойства $property приводит к diff.changed',
            ({ columnOverride, fieldOverride }) => {
                const column = createMockColumn({ name: 'col', ...columnOverride });
                const table = createMockTable({ name: 'users', columns: [column] });
                const storedResource = createMockStoredResource({ id: 1, tableName: 'users' });
                const storedField = createMockStoredField({
                    id: 10,
                    resourceId: 1,
                    name: 'col',
                    ...fieldOverride,
                });

                const diff = buildFieldDiff([table], [storedResource], [storedField]);

                expect(diff.changed).toEqual([{ snapshot: column, stored: storedField }]);
                expect(diff.unchanged).toEqual([]);
                expect(diff.added).toEqual([]);
                expect(diff.missing).toEqual([]);
            },
        );
    });

    it('6. Поле со state=missing вернулось → changed', () => {
        const column = createMockColumn({ name: 'archived_col' });
        const table = createMockTable({ name: 'users', columns: [column] });

        const storedResource = createMockStoredResource({ id: 1, tableName: 'users' });
        const storedField = createMockStoredField({
            id: 10,
            resourceId: 1,
            name: 'archived_col',
            state: 'missing',
        });

        const diff = buildFieldDiff([table], [storedResource], [storedField]);

        expect(diff.changed).toEqual([
            { snapshot: column, stored: storedField },
        ]);
        expect(diff.unchanged).toEqual([]);
        expect(diff.added).toEqual([]);
        expect(diff.missing).toEqual([]);
    });

    it('7. Колонка исчезла из существующей таблицы → missing', () => {
        const colId = createMockColumn({ name: 'id' });
        const table = createMockTable({ name: 'users', columns: [colId] });

        const storedResource = createMockStoredResource({ id: 1, tableName: 'users' });
        const storedId = createMockStoredField({ id: 10, resourceId: 1, name: 'id', state: 'present' });
        const storedDeleted = createMockStoredField({ id: 11, resourceId: 1, name: 'deleted_col', state: 'present' });

        const diff = buildFieldDiff([table], [storedResource], [storedId, storedDeleted]);

        expect(diff.missing).toEqual([storedDeleted]);
        expect(diff.unchanged).toEqual([
            { snapshot: colId, stored: storedId },
        ]);
        expect(diff.added).toEqual([]);
        expect(diff.changed).toEqual([]);
    });

    it('8. Исчезла вся таблица → все её present-поля missing', () => {
        const storedResource = createMockStoredResource({ id: 1, tableName: 'users' });
        const storedCol1 = createMockStoredField({ id: 10, resourceId: 1, name: 'id', state: 'present' });
        const storedCol2 = createMockStoredField({ id: 11, resourceId: 1, name: 'name', state: 'present' });

        const diff = buildFieldDiff([], [storedResource], [storedCol1, storedCol2]);

        expect(diff.missing).toEqual([storedCol1, storedCol2]);
        expect(diff.added).toEqual([]);
        expect(diff.changed).toEqual([]);
        expect(diff.unchanged).toEqual([]);
    });

    it('9. Уже отсутствующее поле не попадает в missing повторно', () => {
        const storedResource = createMockStoredResource({ id: 1, tableName: 'users' });
        const storedMissing = createMockStoredField({
            id: 10,
            resourceId: 1,
            name: 'long_gone_col',
            state: 'missing',
        });

        const diff = buildFieldDiff([], [storedResource], [storedMissing]);

        expect(diff.missing).toEqual([]);
        expect(diff.added).toEqual([]);
        expect(diff.changed).toEqual([]);
        expect(diff.unchanged).toEqual([]);
    });

    it('10. Изменённое поле не попадает одновременно в missing', () => {
        const col = createMockColumn({ name: 'id', comment: 'New comment' });
        const table = createMockTable({ name: 'users', columns: [col] });

        const storedResource = createMockStoredResource({ id: 1, tableName: 'users' });
        const storedField = createMockStoredField({
            id: 10,
            resourceId: 1,
            name: 'id',
            comment: null,
            state: 'present',
        });

        const diff = buildFieldDiff([table], [storedResource], [storedField]);

        expect(diff.changed).toEqual([
            { snapshot: col, stored: storedField },
        ]);
        expect(diff.missing).toEqual([]);
        expect(diff.unchanged).toEqual([]);
        expect(diff.added).toEqual([]);
    });

    it('11. Две таблицы имеют колонку id → поля не смешиваются между ресурсами', () => {
        const colUsersId = createMockColumn({ name: 'id', comment: 'Users ID' });
        const colOrdersId = createMockColumn({ name: 'id', comment: 'Orders ID' });

        const tableUsers = createMockTable({ name: 'users', columns: [colUsersId] });
        const tableOrders = createMockTable({ name: 'orders', columns: [colOrdersId] });

        const storedUsers = createMockStoredResource({ id: 1, tableName: 'users' });
        const storedOrders = createMockStoredResource({ id: 2, tableName: 'orders' });

        const storedUsersId = createMockStoredField({
            id: 101,
            resourceId: 1,
            name: 'id',
            comment: 'Users ID',
        });
        const storedOrdersId = createMockStoredField({
            id: 102,
            resourceId: 2,
            name: 'id',
            comment: 'Orders ID',
        });

        const diff = buildFieldDiff(
            [tableUsers, tableOrders],
            [storedUsers, storedOrders],
            [storedUsersId, storedOrdersId],
        );

        expect(diff.unchanged).toEqual([
            { snapshot: colUsersId, stored: storedUsersId },
            { snapshot: colOrdersId, stored: storedOrdersId },
        ]);
        expect(diff.added).toEqual([]);
        expect(diff.changed).toEqual([]);
        expect(diff.missing).toEqual([]);
    });

    it('12. Смешанный сценарий со всеми категориями', () => {
        // Таблица 1: полностью новая
        const colNew1 = createMockColumn({ name: 'id' });
        const tableNew = createMockTable({ name: 'new_table', columns: [colNew1] });

        // Таблица 2: существующая
        const colUnchanged = createMockColumn({ name: 'unchanged_col' });
        const colChanged = createMockColumn({ name: 'changed_col', comment: 'Updated' });
        const colRestored = createMockColumn({ name: 'restored_col' });
        const colNewInExisting = createMockColumn({ name: 'new_col' });

        const tableExisting = createMockTable({
            name: 'existing_table',
            columns: [colUnchanged, colChanged, colRestored, colNewInExisting],
        });

        const storedExistingRes = createMockStoredResource({ id: 1, tableName: 'existing_table' });
        const storedDeletedRes = createMockStoredResource({ id: 2, tableName: 'deleted_table' });

        const storedUnchanged = createMockStoredField({ id: 101, resourceId: 1, name: 'unchanged_col', state: 'present' });
        const storedChanged = createMockStoredField({ id: 102, resourceId: 1, name: 'changed_col', comment: null, state: 'present' });
        const storedRestored = createMockStoredField({ id: 103, resourceId: 1, name: 'restored_col', state: 'missing' });
        const storedDisappeared = createMockStoredField({ id: 104, resourceId: 1, name: 'disappeared_col', state: 'present' });
        const storedStillMissing = createMockStoredField({ id: 105, resourceId: 1, name: 'still_missing_col', state: 'missing' });

        const storedDeletedCol1 = createMockStoredField({ id: 201, resourceId: 2, name: 'col1', state: 'present' });
        const storedDeletedCol2 = createMockStoredField({ id: 202, resourceId: 2, name: 'col2', state: 'missing' });

        const diff = buildFieldDiff(
            [tableNew, tableExisting],
            [storedExistingRes, storedDeletedRes],
            [
                storedUnchanged,
                storedChanged,
                storedRestored,
                storedDisappeared,
                storedStillMissing,
                storedDeletedCol1,
                storedDeletedCol2,
            ],
        );

        expect(diff.added).toEqual([
            { tableName: 'new_table', column: colNew1 },
            { tableName: 'existing_table', column: colNewInExisting },
        ]);

        expect(diff.unchanged).toEqual([
            { snapshot: colUnchanged, stored: storedUnchanged },
        ]);

        expect(diff.changed).toEqual([
            { snapshot: colChanged, stored: storedChanged },
            { snapshot: colRestored, stored: storedRestored },
        ]);

        expect(diff.missing).toEqual([
            storedDisappeared,
            storedDeletedCol1,
        ]);
    });
});
