import { describe, it, expect } from 'vitest';
import { schemaSnapshotBuilder } from './schema-snapshot.builder';
import type { InformationSchemaTableRow, InformationSchemaColumnRow } from './information-schema.types';

type MockTableRow = {
    schemaName?: string;
    tableName: string;
    tableType?: 'BASE TABLE' | 'VIEW' | string;
    engine?: string | null;
    tableComment?: string;
};

type MockColumnRow = {
    tableName: string;
    columnName: string;
    ordinalPosition?: number;
    columnDefault?: string | null;
    isNullable?: 'YES' | 'NO';
    dataType?: string;
    characterMaximumLength?: number | null;
    numericPrecision?: number | null;
    numericScale?: number | null;
    datetimePrecision?: number | null;
    columnType?: string;
    extra?: string;
    generationExpression?: string;
    characterSetName?: string | null;
    collationName?: string | null;
    columnComment?: string;
};

const createTableRow = (overrides: MockTableRow): InformationSchemaTableRow => {
    return {
        schemaName: 'test_schema',
        tableType: 'BASE TABLE',
        engine: 'InnoDB',
        tableComment: '',
        ...overrides,
    } as unknown as InformationSchemaTableRow;
};

const createColumnRow = (overrides: MockColumnRow): InformationSchemaColumnRow => {
    return {
        ordinalPosition: 1,
        columnDefault: null,
        isNullable: 'NO',
        dataType: 'varchar',
        characterMaximumLength: null,
        numericPrecision: null,
        numericScale: null,
        datetimePrecision: null,
        columnType: 'varchar(255)',
        extra: '',
        generationExpression: '',
        characterSetName: 'utf8mb4',
        collationName: 'utf8mb4_unicode_ci',
        columnComment: '',
        ...overrides,
    } as unknown as InformationSchemaColumnRow;
};

describe('schemaSnapshotBuilder', () => {
    const schemaName = 'test_schema';
    const scannedAt = new Date('2026-09-10T12:00:00.000Z');

    // ---------------------------------------------------------------------------
    // 1. Сборка таблицы с колонками
    // ---------------------------------------------------------------------------
    it('1. Сборка таблицы с колонками: сохраняет schemaName, scannedAt, трансформирует тип, engine и свойства колонок', () => {
        const rawTables = [
            createTableRow({
                tableName: 'orders',
                tableType: 'BASE TABLE',
                engine: 'InnoDB',
            }),
        ];

        const rawColumns = [
            createColumnRow({
                tableName: 'orders',
                columnName: 'id',
                dataType: 'bigint',
                columnType: 'bigint',
                numericPrecision: 19,
                numericScale: 0,
                isNullable: 'NO',
                extra: 'auto_increment',
                ordinalPosition: 1,
            }),
            createColumnRow({
                tableName: 'orders',
                columnName: 'total',
                dataType: 'decimal',
                columnType: 'decimal(10,2)',
                numericPrecision: 10,
                numericScale: 2,
                isNullable: 'NO',
                extra: '',
                ordinalPosition: 2,
            }),
        ];

        const snapshot = schemaSnapshotBuilder(schemaName, scannedAt, {
            tables: rawTables,
            columns: rawColumns,
        });

        // schemaName и scannedAt сохранились
        expect(snapshot.schemaName).toBe(schemaName);
        expect(snapshot.scannedAt).toEqual(scannedAt);

        const ordersTable = snapshot.tables.find((t) => t.name === 'orders');
        expect(ordersTable).toBeDefined();

        // type стал table, engine остался InnoDB
        expect(ordersTable?.type).toBe('table');
        expect(ordersTable?.engine).toBe('InnoDB');

        // В таблице две колонки
        expect(ordersTable?.columns).toHaveLength(2);

        const idCol = ordersTable?.columns.find((c) => c.name === 'id');
        const totalCol = ordersTable?.columns.find((c) => c.name === 'total');

        expect(idCol).toBeDefined();
        expect(totalCol).toBeDefined();

        // id.autoIncrement равно true, total.autoIncrement равно false
        expect(idCol?.autoIncrement).toBe(true);
        expect(totalCol?.autoIncrement).toBe(false);

        // NO превратилось в nullable: false
        expect(idCol?.nullable).toBe(false);
        expect(totalCol?.nullable).toBe(false);

        // columnType, precision и scale согласованы
        expect(idCol?.columnType).toBe('bigint');
        expect(idCol?.numericPrecision).toBe(19);
        expect(idCol?.numericScale).toBe(0);

        expect(totalCol?.columnType).toBe('decimal(10,2)');
        expect(totalCol?.numericPrecision).toBe(10);
        expect(totalCol?.numericScale).toBe(2);
    });

    // ---------------------------------------------------------------------------
    // 2. Нормализация view, комментариев и generated
    // ---------------------------------------------------------------------------
    it('2. Нормализация view, комментариев и generated: нормализует пустые строки в null/false и сохраняет выражения', () => {
        const rawTables = [
            createTableRow({
                tableName: 'report',
                tableType: 'VIEW',
                engine: null,
                tableComment: '',
            }),
        ];

        const rawColumns = [
            createColumnRow({
                tableName: 'report',
                columnName: 'title',
                dataType: 'varchar',
                isNullable: 'YES',
                columnComment: '',
                generationExpression: '',
                ordinalPosition: 1,
            }),
            createColumnRow({
                tableName: 'report',
                columnName: 'formatted_title',
                dataType: 'varchar',
                isNullable: 'YES',
                columnComment: 'Generated header',
                generationExpression: 'CONCAT(title, " [v1]")',
                ordinalPosition: 2,
            }),
        ];

        const snapshot = schemaSnapshotBuilder(schemaName, scannedAt, {
            tables: rawTables,
            columns: rawColumns,
        });

        const reportView = snapshot.tables.find((t) => t.name === 'report');
        expect(reportView).toBeDefined();

        // type === view, engine === null, comment === null
        expect(reportView?.type).toBe('view');
        expect(reportView?.engine).toBeNull();
        expect(reportView?.comment).toBeNull();

        // Колонка с пустыми полями: comment === null, isGenerated === false, generationExpression === null
        const titleCol = reportView?.columns.find((c) => c.name === 'title');
        expect(titleCol).toBeDefined();
        expect(titleCol?.comment).toBeNull();
        expect(titleCol?.generated.isGenerated).toBe(false);
        expect(titleCol?.generated.generationExpression).toBeNull();

        // Generated-колонка с выражением: противоположный результат
        const generatedCol = reportView?.columns.find((c) => c.name === 'formatted_title');
        expect(generatedCol).toBeDefined();
        expect(generatedCol?.comment).toBe('Generated header');
        expect(generatedCol?.generated.isGenerated).toBe(true);
        expect(generatedCol?.generated.generationExpression).toBe('CONCAT(title, " [v1]")');
    });

    // ---------------------------------------------------------------------------
    // 3. Служебная таблица (Auto_Admin__)
    // ---------------------------------------------------------------------------
    it('3. Служебная таблица: помечает Auto_Admin__* как isServiceTable: true, а обычную users как false', () => {
        const rawTables = [
            createTableRow({
                tableName: 'Auto_Admin__users',
                tableType: 'BASE TABLE',
            }),
            createTableRow({
                tableName: 'users',
                tableType: 'BASE TABLE',
            }),
        ];

        const rawColumns = [
            createColumnRow({
                tableName: 'Auto_Admin__users',
                columnName: 'id',
                ordinalPosition: 1,
            }),
            createColumnRow({
                tableName: 'users',
                columnName: 'id',
                ordinalPosition: 1,
            }),
        ];

        const snapshot = schemaSnapshotBuilder(schemaName, scannedAt, {
            tables: rawTables,
            columns: rawColumns,
        });

        const serviceTable = snapshot.tables.find((t) => t.name === 'Auto_Admin__users');
        const regularTable = snapshot.tables.find((t) => t.name === 'users');

        expect(serviceTable).toBeDefined();
        expect(regularTable).toBeDefined();

        // Проверка для безопасности: служебная таблица не должна попасть в generic CRUD
        expect(serviceTable?.isServiceTable).toBe(true);
        expect(regularTable?.isServiceTable).toBe(false);
    });

    // ---------------------------------------------------------------------------
    // 4. Колонка неизвестной таблицы
    // ---------------------------------------------------------------------------
    it('4. Колонка неизвестной таблицы: синхронно выбрасывает ошибку при отсутствии таблицы', () => {
        const rawTables: InformationSchemaTableRow[] = [];
        const rawColumns = [
            createColumnRow({
                tableName: 'ghost_table',
                columnName: 'id',
                ordinalPosition: 1,
            }),
        ];

        // Синхронный вызов builder без async/await/rejects
        expect(() =>
            schemaSnapshotBuilder(schemaName, scannedAt, {
                tables: rawTables,
                columns: rawColumns,
            }),
        ).toThrowError('Table ghost_table not found for column id');
    });

    // ---------------------------------------------------------------------------
    // Второстепенные, но важные тесты
    // ---------------------------------------------------------------------------
    describe('Второстепенные граничные сценарии', () => {
        it('преобразует isNullable: "YES" в nullable: true', () => {
            const snapshot = schemaSnapshotBuilder(schemaName, scannedAt, {
                tables: [createTableRow({ tableName: 'posts' })],
                columns: [
                    createColumnRow({
                        tableName: 'posts',
                        columnName: 'description',
                        isNullable: 'YES',
                    }),
                ],
            });

            const postTable = snapshot.tables.find((t) => t.name === 'posts');
            const descCol = postTable?.columns.find((c) => c.name === 'description');
            expect(descCol?.nullable).toBe(true);
        });

        it('сохраняет непустые комментарии для таблицы и колонки без изменений', () => {
            const snapshot = schemaSnapshotBuilder(schemaName, scannedAt, {
                tables: [
                    createTableRow({
                        tableName: 'accounts',
                        tableComment: 'Таблица пользовательских счетов',
                    }),
                ],
                columns: [
                    createColumnRow({
                        tableName: 'accounts',
                        columnName: 'balance',
                        columnComment: 'Баланс в валюте',
                    }),
                ],
            });

            const accountTable = snapshot.tables.find((t) => t.name === 'accounts');
            const balanceCol = accountTable?.columns.find((c) => c.name === 'balance');

            expect(accountTable?.comment).toBe('Таблица пользовательских счетов');
            expect(balanceCol?.comment).toBe('Баланс в валюте');
        });

        it('сортирует таблицы по алфавиту и колонки по position (ordinalPosition)', () => {
            const snapshot = schemaSnapshotBuilder(schemaName, scannedAt, {
                tables: [
                    createTableRow({ tableName: 'zebra' }),
                    createTableRow({ tableName: 'alpha' }),
                ],
                columns: [
                    createColumnRow({
                        tableName: 'alpha',
                        columnName: 'col_second',
                        ordinalPosition: 2,
                    }),
                    createColumnRow({
                        tableName: 'alpha',
                        columnName: 'col_first',
                        ordinalPosition: 1,
                    }),
                ],
            });

            // Таблицы отсортированы по имени (localeCompare)
            expect(snapshot.tables.map((t) => t.name)).toEqual(['alpha', 'zebra']);

            // Колонки отсортированы по position
            const alphaTable = snapshot.tables.find((t) => t.name === 'alpha');
            expect(alphaTable?.columns.map((c) => c.name)).toEqual(['col_first', 'col_second']);
        });

        it('выбрасывает ошибку при неизвестном tableType', () => {
            expect(() =>
                schemaSnapshotBuilder(schemaName, scannedAt, {
                    tables: [
                        createTableRow({
                            tableName: 'unknown_type_table',
                            tableType: 'UNKNOWN',
                        }),
                    ],
                    columns: [],
                }),
            ).toThrowError(/Unknown table type: UNKNOWN/);
        });

        it('трактует generationExpression состоящее только из пробелов как не-generated (trimmedExpression !== "")', () => {
            const snapshot = schemaSnapshotBuilder(schemaName, scannedAt, {
                tables: [createTableRow({ tableName: 'test_table' })],
                columns: [
                    createColumnRow({
                        tableName: 'test_table',
                        columnName: 'whitespace_expr',
                        generationExpression: '   ',
                    }),
                ],
            });

            const col = snapshot.tables[0]?.columns[0];
            expect(col?.generated.isGenerated).toBe(false);
            expect(col?.generated.generationExpression).toBeNull();
        });
    });
});