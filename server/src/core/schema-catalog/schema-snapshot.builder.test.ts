import { describe, it, expect } from 'vitest';
import { schemaSnapshotBuilder } from './schema-snapshot.builder';
import type {
  InformationSchemaTableRow,
  InformationSchemaColumnRow,
  InformationSchemaKeyConstraintRow,
  InformationSchemaForeignKeyRow,
  InformationSchemaIndexRow,
  InformationSchemaReferentialAction,
  InformationSchemaRows,
} from './information-schema.types';

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

type MockKeyConstraintRow = {
  tableName: string;
  constraintName: string;
  constraintType: 'PRIMARY KEY' | 'UNIQUE';
  columnName: string;
  ordinalPosition?: number;
};

type MockForeignKeyRow = {
  tableName: string;
  constraintName: string;
  columnName: string;
  ordinalPosition?: number;
  referencedSchemaName?: string;
  referencedTableName: string;
  referencedColumnName: string;
  updateRule?: InformationSchemaReferentialAction;
  deleteRule?: InformationSchemaReferentialAction;
};

type MockIndexRow = {
  tableName: string;
  indexName: string;
  nonUnique?: 0 | 1;
  sequenceInIndex?: number;
  columnName?: string | null;
  expression?: string | null;
  indexType?: string;
  collation?: 'A' | 'D' | null;
  subPart?: number | null;
  isVisible?: 'YES' | 'NO';
  indexComment?: string;
};

type MockInformationSchemaRows = Partial<InformationSchemaRows>;

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

const createKeyConstraintRow = (overrides: MockKeyConstraintRow): InformationSchemaKeyConstraintRow => {
  return {
    ordinalPosition: 1,
    ...overrides,
  } as unknown as InformationSchemaKeyConstraintRow;
};

const createForeignKeyRow = (overrides: MockForeignKeyRow): InformationSchemaForeignKeyRow => {
  return {
    ordinalPosition: 1,
    referencedSchemaName: 'test_schema',
    updateRule: 'NO ACTION',
    deleteRule: 'NO ACTION',
    ...overrides,
  } as unknown as InformationSchemaForeignKeyRow;
};

const createIndexRow = (overrides: MockIndexRow): InformationSchemaIndexRow => {
  return {
    nonUnique: 1,
    sequenceInIndex: 1,
    columnName: null,
    expression: null,
    indexType: 'BTREE',
    collation: 'A',
    subPart: null,
    isVisible: 'YES',
    indexComment: '',
    ...overrides,
  } as unknown as InformationSchemaIndexRow;
};

const createInformationSchemaRows = (
  overrides: MockInformationSchemaRows = {},
): InformationSchemaRows => {
  return {
    tables: [],
    columns: [],
    keyConstraints: [],
    foreignKeys: [],
    indexes: [],
    ...overrides,
  };
};

describe('schemaSnapshotBuilder', () => {
  const schemaName = 'test_schema';
  const scannedAt = new Date('2026-09-10T12:00:00.000Z');

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

    const snapshot = schemaSnapshotBuilder(
      schemaName,
      scannedAt,
      createInformationSchemaRows({
        tables: rawTables,
        columns: rawColumns,
      }),
    );

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

    // primaryKey, uniqueKeys и foreignKeys по умолчанию пусты
    expect(ordersTable?.primaryKey).toBeNull();
    expect(ordersTable?.uniqueKeys).toEqual([]);
    expect(ordersTable?.foreignKeys).toEqual([]);
  });

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

    const snapshot = schemaSnapshotBuilder(
      schemaName,
      scannedAt,
      createInformationSchemaRows({
        tables: rawTables,
        columns: rawColumns,
      }),
    );

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

    const snapshot = schemaSnapshotBuilder(
      schemaName,
      scannedAt,
      createInformationSchemaRows({
        tables: rawTables,
        columns: rawColumns,
      }),
    );

    const serviceTable = snapshot.tables.find((t) => t.name === 'Auto_Admin__users');
    const regularTable = snapshot.tables.find((t) => t.name === 'users');

    expect(serviceTable).toBeDefined();
    expect(regularTable).toBeDefined();

    // Проверка для безопасности: служебная таблица не должна попасть в generic CRUD
    expect(serviceTable?.isServiceTable).toBe(true);
    expect(regularTable?.isServiceTable).toBe(false);
  });

  it('4. Колонка неизвестной таблицы: синхронно выбрасывает ошибку при отсутствии таблицы', () => {
    const rawColumns = [
      createColumnRow({
        tableName: 'ghost_table',
        columnName: 'id',
        ordinalPosition: 1,
      }),
    ];

    // Синхронный вызов builder без async/await/rejects
    expect(() =>
      schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
          columns: rawColumns,
        }),
      ),
    ).toThrowError('Table ghost_table not found for column id');
  });

  describe('keyConstraints (Primary & Unique keys)', () => {
    it('обрабатывает обычный primary key (PRIMARY -> id)', () => {
      const rawTables = [createTableRow({ tableName: 'users' })];
      const rawColumns = [
        createColumnRow({ tableName: 'users', columnName: 'id', dataType: 'bigint', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'users', columnName: 'email', dataType: 'varchar', ordinalPosition: 2 }),
      ];
      const rawConstraints = [
        createKeyConstraintRow({
          tableName: 'users',
          constraintName: 'PRIMARY',
          constraintType: 'PRIMARY KEY',
          columnName: 'id',
          ordinalPosition: 1,
        }),
      ];

      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
          tables: rawTables,
          columns: rawColumns,
          keyConstraints: rawConstraints,
        }),
      );

      const userTable = snapshot.tables.find((t) => t.name === 'users');
      expect(userTable?.primaryKey).toEqual({
        name: 'PRIMARY',
        columns: ['id'],
      });
    });

    it('сортирует колонки составного primary key по ordinalPosition при raw-строках в неправильном порядке', () => {
      const rawTables = [createTableRow({ tableName: 'tenant_orders' })];
      const rawColumns = [
        createColumnRow({ tableName: 'tenant_orders', columnName: 'tenant_id', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'tenant_orders', columnName: 'order_id', ordinalPosition: 2 }),
      ];

      // Передаем order_id (position 2) перед tenant_id (position 1)
      const rawConstraints = [
        createKeyConstraintRow({
          tableName: 'tenant_orders',
          constraintName: 'PRIMARY',
          constraintType: 'PRIMARY KEY',
          columnName: 'order_id',
          ordinalPosition: 2,
        }),
        createKeyConstraintRow({
          tableName: 'tenant_orders',
          constraintName: 'PRIMARY',
          constraintType: 'PRIMARY KEY',
          columnName: 'tenant_id',
          ordinalPosition: 1,
        }),
      ];

      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
          tables: rawTables,
          columns: rawColumns,
          keyConstraints: rawConstraints,
        }),
      );

      const table = snapshot.tables.find((t) => t.name === 'tenant_orders');
      // Ожидаемый результат: tenant_id, order_id
      expect(table?.primaryKey).toEqual({
        name: 'PRIMARY',
        columns: ['tenant_id', 'order_id'],
      });
    });

    it('обрабатывает и сортирует по имени несколько unique keys одной таблицы', () => {
      const rawTables = [createTableRow({ tableName: 'users' })];
      const rawColumns = [
        createColumnRow({ tableName: 'users', columnName: 'id', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'users', columnName: 'email', ordinalPosition: 2 }),
        createColumnRow({ tableName: 'users', columnName: 'phone', ordinalPosition: 3 }),
      ];

      // Передаем uq_phone перед uq_email для проверки сортировки по алфавиту
      const rawConstraints = [
        createKeyConstraintRow({
          tableName: 'users',
          constraintName: 'uq_phone',
          constraintType: 'UNIQUE',
          columnName: 'phone',
          ordinalPosition: 1,
        }),
        createKeyConstraintRow({
          tableName: 'users',
          constraintName: 'uq_email',
          constraintType: 'UNIQUE',
          columnName: 'email',
          ordinalPosition: 1,
        }),
      ];

      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
          tables: rawTables,
          columns: rawColumns,
          keyConstraints: rawConstraints,
        }),
      );

      const userTable = snapshot.tables.find((t) => t.name === 'users');
      expect(userTable?.uniqueKeys).toEqual([
        {
          name: 'uq_email',
          columns: ['email'],
        },
        {
          name: 'uq_phone',
          columns: ['phone'],
        },
      ]);
    });

    it('обрабатывает составной unique key и сортирует его колонки по ordinalPosition при перепутанном порядке', () => {
      const rawTables = [createTableRow({ tableName: 'memberships' })];
      const rawColumns = [
        createColumnRow({ tableName: 'memberships', columnName: 'organization_id', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'memberships', columnName: 'user_id', ordinalPosition: 2 }),
      ];

      // Передаем user_id (position 2) перед organization_id (position 1)
      const rawConstraints = [
        createKeyConstraintRow({
          tableName: 'memberships',
          constraintName: 'uq_org_user',
          constraintType: 'UNIQUE',
          columnName: 'user_id',
          ordinalPosition: 2,
        }),
        createKeyConstraintRow({
          tableName: 'memberships',
          constraintName: 'uq_org_user',
          constraintType: 'UNIQUE',
          columnName: 'organization_id',
          ordinalPosition: 1,
        }),
      ];

      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
          tables: rawTables,
          columns: rawColumns,
          keyConstraints: rawConstraints,
        }),
      );

      const table = snapshot.tables.find((t) => t.name === 'memberships');
      expect(table?.uniqueKeys).toEqual([
        {
          name: 'uq_org_user',
          columns: ['organization_id', 'user_id'],
        },
      ]);
    });

    it('выбрасывает ошибку, если constraint указывает на неизвестную таблицу', () => {
      const rawTables = [createTableRow({ tableName: 'users' })];
      const rawColumns = [createColumnRow({ tableName: 'users', columnName: 'id' })];
      const rawConstraints = [
        createKeyConstraintRow({
          tableName: 'unknown_table',
          constraintName: 'PRIMARY',
          constraintType: 'PRIMARY KEY',
          columnName: 'id',
          ordinalPosition: 1,
        }),
      ];

      expect(() =>
        schemaSnapshotBuilder(
          schemaName,
          scannedAt,
          createInformationSchemaRows({
            tables: rawTables,
            columns: rawColumns,
            keyConstraints: rawConstraints,
          }),
        ),
      ).toThrowError('Table unknown_table not found for constraints');
    });

    it('выбрасывает ошибку, если constraint ссылается на несуществующую колонку', () => {
      const rawTables = [createTableRow({ tableName: 'users' })];
      const rawColumns = [createColumnRow({ tableName: 'users', columnName: 'id' })];
      const rawConstraints = [
        createKeyConstraintRow({
          tableName: 'users',
          constraintName: 'PRIMARY',
          constraintType: 'PRIMARY KEY',
          columnName: 'ghost_column',
          ordinalPosition: 1,
        }),
      ];

      expect(() =>
        schemaSnapshotBuilder(
          schemaName,
          scannedAt,
          createInformationSchemaRows({
            tables: rawTables,
            columns: rawColumns,
            keyConstraints: rawConstraints,
          }),
        ),
      ).toThrowError('Column ghost_column not found for table users');
    });

    it('выбрасывает ошибку при попытке определить несколько primary keys для одной таблицы', () => {
      const rawTables = [createTableRow({ tableName: 'users' })];
      const rawColumns = [
        createColumnRow({ tableName: 'users', columnName: 'id', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'users', columnName: 'uuid', ordinalPosition: 2 }),
      ];
      const rawConstraints = [
        createKeyConstraintRow({
          tableName: 'users',
          constraintName: 'PRIMARY',
          constraintType: 'PRIMARY KEY',
          columnName: 'id',
          ordinalPosition: 1,
        }),
        createKeyConstraintRow({
          tableName: 'users',
          constraintName: 'PK_uuid',
          constraintType: 'PRIMARY KEY',
          columnName: 'uuid',
          ordinalPosition: 1,
        }),
      ];

      expect(() =>
        schemaSnapshotBuilder(
          schemaName,
          scannedAt,
          createInformationSchemaRows({
            tables: rawTables,
            columns: rawColumns,
            keyConstraints: rawConstraints,
          }),
        ),
      ).toThrowError('Table users has multiple primary keys');
    });
  });

  describe('foreignKeys', () => {
    it('1. Обычная внутренняя связь (orders.user_id -> users.id)', () => {
      const rawTables = [
        createTableRow({ tableName: 'orders' }),
        createTableRow({ tableName: 'users' }),
      ];
      const rawColumns = [
        createColumnRow({ tableName: 'orders', columnName: 'id', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'orders', columnName: 'user_id', ordinalPosition: 2 }),
        createColumnRow({ tableName: 'users', columnName: 'id', ordinalPosition: 1 }),
      ];
      const rawForeignKeys = [
        createForeignKeyRow({
          tableName: 'orders',
          constraintName: 'fk_orders_user',
          columnName: 'user_id',
          ordinalPosition: 1,
          referencedSchemaName: schemaName,
          referencedTableName: 'users',
          referencedColumnName: 'id',
          updateRule: 'CASCADE',
          deleteRule: 'RESTRICT',
        }),
      ];

      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
          tables: rawTables,
          columns: rawColumns,
          foreignKeys: rawForeignKeys,
        }),
      );

      const ordersTable = snapshot.tables.find((t) => t.name === 'orders');
      expect(ordersTable?.foreignKeys).toEqual([
        {
          name: 'fk_orders_user',
          columns: ['user_id'],
          referencedSchemaName: schemaName,
          referencedTableName: 'users',
          referencedColumns: ['id'],
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
      ]);
    });

    it('2. Составная связь с перепутанным порядком raw-строк', () => {
      const rawTables = [
        createTableRow({ tableName: 'order_items' }),
        createTableRow({ tableName: 'orders' }),
      ];
      const rawColumns = [
        createColumnRow({ tableName: 'order_items', columnName: 'tenant_id', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'order_items', columnName: 'order_id', ordinalPosition: 2 }),
        createColumnRow({ tableName: 'orders', columnName: 'tenant_id', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'orders', columnName: 'id', ordinalPosition: 2 }),
      ];

      // Передаем order_id (ordinalPosition: 2) перед tenant_id (ordinalPosition: 1)
      const rawForeignKeys = [
        createForeignKeyRow({
          tableName: 'order_items',
          constraintName: 'fk_order_items_order',
          columnName: 'order_id',
          ordinalPosition: 2,
          referencedSchemaName: schemaName,
          referencedTableName: 'orders',
          referencedColumnName: 'id',
          updateRule: 'CASCADE',
          deleteRule: 'CASCADE',
        }),
        createForeignKeyRow({
          tableName: 'order_items',
          constraintName: 'fk_order_items_order',
          columnName: 'tenant_id',
          ordinalPosition: 1,
          referencedSchemaName: schemaName,
          referencedTableName: 'orders',
          referencedColumnName: 'tenant_id',
          updateRule: 'CASCADE',
          deleteRule: 'CASCADE',
        }),
      ];

      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
          tables: rawTables,
          columns: rawColumns,
          foreignKeys: rawForeignKeys,
        }),
      );

      const itemsTable = snapshot.tables.find((t) => t.name === 'order_items');
      expect(itemsTable?.foreignKeys).toEqual([
        {
          name: 'fk_order_items_order',
          columns: ['tenant_id', 'order_id'],
          referencedSchemaName: schemaName,
          referencedTableName: 'orders',
          referencedColumns: ['tenant_id', 'id'],
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
      ]);
    });

    it('3. Self-reference (categories.parent_id -> categories.id)', () => {
      const rawTables = [createTableRow({ tableName: 'categories' })];
      const rawColumns = [
        createColumnRow({ tableName: 'categories', columnName: 'id', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'categories', columnName: 'parent_id', ordinalPosition: 2 }),
      ];
      const rawForeignKeys = [
        createForeignKeyRow({
          tableName: 'categories',
          constraintName: 'fk_categories_parent',
          columnName: 'parent_id',
          ordinalPosition: 1,
          referencedSchemaName: schemaName,
          referencedTableName: 'categories',
          referencedColumnName: 'id',
          updateRule: 'CASCADE',
          deleteRule: 'SET NULL',
        }),
      ];

      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
          tables: rawTables,
          columns: rawColumns,
          foreignKeys: rawForeignKeys,
        }),
      );

      const categoriesTable = snapshot.tables.find((t) => t.name === 'categories');
      expect(categoriesTable?.foreignKeys).toEqual([
        {
          name: 'fk_categories_parent',
          columns: ['parent_id'],
          referencedSchemaName: schemaName,
          referencedTableName: 'categories',
          referencedColumns: ['id'],
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
      ]);
    });

    it('4. Cross-schema FK сохраняется, даже если referenced table отсутствует в snapshot', () => {
      const rawTables = [createTableRow({ tableName: 'orders' })];
      const rawColumns = [
        createColumnRow({ tableName: 'orders', columnName: 'id', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'orders', columnName: 'account_id', ordinalPosition: 2 }),
      ];
      const rawForeignKeys = [
        createForeignKeyRow({
          tableName: 'orders',
          constraintName: 'fk_orders_account',
          columnName: 'account_id',
          ordinalPosition: 1,
          referencedSchemaName: 'auth_schema',
          referencedTableName: 'accounts',
          referencedColumnName: 'id',
          updateRule: 'NO ACTION',
          deleteRule: 'NO ACTION',
        }),
      ];

      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
          tables: rawTables,
          columns: rawColumns,
          foreignKeys: rawForeignKeys,
        }),
      );

      const ordersTable = snapshot.tables.find((t) => t.name === 'orders');
      expect(ordersTable?.foreignKeys).toEqual([
        {
          name: 'fk_orders_account',
          columns: ['account_id'],
          referencedSchemaName: 'auth_schema',
          referencedTableName: 'accounts',
          referencedColumns: ['id'],
          onUpdate: 'NO ACTION',
          onDelete: 'NO ACTION',
        },
      ]);
    });

    it('5. Внутренняя referenced table отсутствует — ошибка', () => {
      const rawTables = [createTableRow({ tableName: 'orders' })];
      const rawColumns = [createColumnRow({ tableName: 'orders', columnName: 'user_id' })];
      const rawForeignKeys = [
        createForeignKeyRow({
          tableName: 'orders',
          constraintName: 'fk_orders_user',
          columnName: 'user_id',
          ordinalPosition: 1,
          referencedSchemaName: schemaName,
          referencedTableName: 'non_existent_users',
          referencedColumnName: 'id',
        }),
      ];

      expect(() =>
        schemaSnapshotBuilder(
          schemaName,
          scannedAt,
          createInformationSchemaRows({
            tables: rawTables,
            columns: rawColumns,
            foreignKeys: rawForeignKeys,
          }),
        ),
      ).toThrowError('Table non_existent_users not found for foreign key constraints');
    });

    it('6. Внутренняя referenced column отсутствует — ошибка', () => {
      const rawTables = [
        createTableRow({ tableName: 'orders' }),
        createTableRow({ tableName: 'users' }),
      ];
      const rawColumns = [
        createColumnRow({ tableName: 'orders', columnName: 'user_id' }),
        createColumnRow({ tableName: 'users', columnName: 'id' }),
      ];
      const rawForeignKeys = [
        createForeignKeyRow({
          tableName: 'orders',
          constraintName: 'fk_orders_user',
          columnName: 'user_id',
          ordinalPosition: 1,
          referencedSchemaName: schemaName,
          referencedTableName: 'users',
          referencedColumnName: 'non_existent_id',
        }),
      ];

      expect(() =>
        schemaSnapshotBuilder(
          schemaName,
          scannedAt,
          createInformationSchemaRows({
            tables: rawTables,
            columns: rawColumns,
            foreignKeys: rawForeignKeys,
          }),
        ),
      ).toThrowError('Column non_existent_id not found for table users');
    });

    it('7. Строки одной группы FK указывают на разные таблицы — ошибка', () => {
      const rawTables = [
        createTableRow({ tableName: 'orders' }),
        createTableRow({ tableName: 'users' }),
        createTableRow({ tableName: 'customers' }),
      ];
      const rawColumns = [
        createColumnRow({ tableName: 'orders', columnName: 'col1', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'orders', columnName: 'col2', ordinalPosition: 2 }),
        createColumnRow({ tableName: 'users', columnName: 'id', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'customers', columnName: 'id', ordinalPosition: 1 }),
      ];
      const rawForeignKeys = [
        createForeignKeyRow({
          tableName: 'orders',
          constraintName: 'fk_inconsistent',
          columnName: 'col1',
          ordinalPosition: 1,
          referencedSchemaName: schemaName,
          referencedTableName: 'users',
          referencedColumnName: 'id',
          updateRule: 'CASCADE',
          deleteRule: 'CASCADE',
        }),
        createForeignKeyRow({
          tableName: 'orders',
          constraintName: 'fk_inconsistent',
          columnName: 'col2',
          ordinalPosition: 2,
          referencedSchemaName: schemaName,
          referencedTableName: 'customers',
          referencedColumnName: 'id',
          updateRule: 'CASCADE',
          deleteRule: 'CASCADE',
        }),
      ];

      expect(() =>
        schemaSnapshotBuilder(
          schemaName,
          scannedAt,
          createInformationSchemaRows({
            tables: rawTables,
            columns: rawColumns,
            foreignKeys: rawForeignKeys,
          }),
        ),
      ).toThrowError('Foreign key constraint fk_inconsistent has inconsistent metadata');
    });

    it('7b. Строки одной группы FK имеют разные referential actions (updateRule/deleteRule) — ошибка', () => {
      const rawTables = [
        createTableRow({ tableName: 'order_items' }),
        createTableRow({ tableName: 'orders' }),
      ];
      const rawColumns = [
        createColumnRow({ tableName: 'order_items', columnName: 'tenant_id', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'order_items', columnName: 'order_id', ordinalPosition: 2 }),
        createColumnRow({ tableName: 'orders', columnName: 'tenant_id', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'orders', columnName: 'id', ordinalPosition: 2 }),
      ];
      const rawForeignKeys = [
        createForeignKeyRow({
          tableName: 'order_items',
          constraintName: 'fk_diff_actions',
          columnName: 'tenant_id',
          ordinalPosition: 1,
          referencedSchemaName: schemaName,
          referencedTableName: 'orders',
          referencedColumnName: 'tenant_id',
          updateRule: 'CASCADE',
          deleteRule: 'CASCADE',
        }),
        createForeignKeyRow({
          tableName: 'order_items',
          constraintName: 'fk_diff_actions',
          columnName: 'order_id',
          ordinalPosition: 2,
          referencedSchemaName: schemaName,
          referencedTableName: 'orders',
          referencedColumnName: 'id',
          updateRule: 'RESTRICT',
          deleteRule: 'CASCADE',
        }),
      ];

      expect(() =>
        schemaSnapshotBuilder(
          schemaName,
          scannedAt,
          createInformationSchemaRows({
            tables: rawTables,
            columns: rawColumns,
            foreignKeys: rawForeignKeys,
          }),
        ),
      ).toThrowError('Foreign key constraint fk_diff_actions has inconsistent metadata');
    });

    it('выбрасывает ошибку, если исходная таблица для FK отсутствует', () => {
      const rawTables = [createTableRow({ tableName: 'users' })];
      const rawColumns = [createColumnRow({ tableName: 'users', columnName: 'id' })];
      const rawForeignKeys = [
        createForeignKeyRow({
          tableName: 'ghost_table',
          constraintName: 'fk_ghost',
          columnName: 'id',
          referencedTableName: 'users',
          referencedColumnName: 'id',
        }),
      ];

      expect(() =>
        schemaSnapshotBuilder(
          schemaName,
          scannedAt,
          createInformationSchemaRows({
            tables: rawTables,
            columns: rawColumns,
            foreignKeys: rawForeignKeys,
          }),
        ),
      ).toThrowError('Table ghost_table not found for foreign key constraints');
    });

    it('выбрасывает ошибку, если колонка в исходной таблице для FK отсутствует', () => {
      const rawTables = [
        createTableRow({ tableName: 'orders' }),
        createTableRow({ tableName: 'users' }),
      ];
      const rawColumns = [
        createColumnRow({ tableName: 'orders', columnName: 'id' }),
        createColumnRow({ tableName: 'users', columnName: 'id' }),
      ];
      const rawForeignKeys = [
        createForeignKeyRow({
          tableName: 'orders',
          constraintName: 'fk_orders_user',
          columnName: 'non_existent_col',
          referencedTableName: 'users',
          referencedColumnName: 'id',
        }),
      ];

      expect(() =>
        schemaSnapshotBuilder(
          schemaName,
          scannedAt,
          createInformationSchemaRows({
            tables: rawTables,
            columns: rawColumns,
            foreignKeys: rawForeignKeys,
          }),
        ),
      ).toThrowError('Column non_existent_col not found for table orders');
    });
  });

  describe('indexes', () => {
    it('1. Обычный индекс по одной колонке: корректно собирает метаданные и DBIndexPart', () => {
      const rawTables = [createTableRow({ tableName: 'users' })];
      const rawColumns = [
        createColumnRow({ tableName: 'users', columnName: 'id', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'users', columnName: 'email', ordinalPosition: 2 }),
      ];
      const rawIndexes = [
        createIndexRow({
          tableName: 'users',
          indexName: 'idx_users_email',
          columnName: 'email',
          nonUnique: 1,
          sequenceInIndex: 1,
          indexType: 'BTREE',
          collation: 'A',
          subPart: null,
          isVisible: 'YES',
          indexComment: '',
        }),
      ];

      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
          tables: rawTables,
          columns: rawColumns,
          indexes: rawIndexes,
        }),
      );

      const userTable = snapshot.tables.find((t) => t.name === 'users');
      expect(userTable?.indexes).toEqual([
        {
          name: 'idx_users_email',
          isUnique: false,
          indexType: 'BTREE',
          isVisible: true,
          comment: null,
          parts: [
            {
              kind: 'column',
              position: 1,
              columnName: 'email',
              expression: null,
              prefixLength: null,
              sortDirection: 'ASC',
            },
          ],
        },
      ]);
    });

    it('2. Составной индекс с перепутанным входным порядком: сортирует parts по sequenceInIndex', () => {
      const rawTables = [createTableRow({ tableName: 'users' })];
      const rawColumns = [
        createColumnRow({ tableName: 'users', columnName: 'tenant_id', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'users', columnName: 'status', ordinalPosition: 2 }),
        createColumnRow({ tableName: 'users', columnName: 'created_at', ordinalPosition: 3 }),
      ];
      // Передаем строки в порядке: 3, 1, 2
      const rawIndexes = [
        createIndexRow({
          tableName: 'users',
          indexName: 'idx_tenant_status_created',
          columnName: 'created_at',
          sequenceInIndex: 3,
        }),
        createIndexRow({
          tableName: 'users',
          indexName: 'idx_tenant_status_created',
          columnName: 'tenant_id',
          sequenceInIndex: 1,
        }),
        createIndexRow({
          tableName: 'users',
          indexName: 'idx_tenant_status_created',
          columnName: 'status',
          sequenceInIndex: 2,
        }),
      ];

      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
          tables: rawTables,
          columns: rawColumns,
          indexes: rawIndexes,
        }),
      );

      const userTable = snapshot.tables.find((t) => t.name === 'users');
      expect(userTable?.indexes[0]?.parts).toEqual([
        {
          kind: 'column',
          position: 1,
          columnName: 'tenant_id',
          expression: null,
          prefixLength: null,
          sortDirection: 'ASC',
        },
        {
          kind: 'column',
          position: 2,
          columnName: 'status',
          expression: null,
          prefixLength: null,
          sortDirection: 'ASC',
        },
        {
          kind: 'column',
          position: 3,
          columnName: 'created_at',
          expression: null,
          prefixLength: null,
          sortDirection: 'ASC',
        },
      ]);
    });

    it('3. Unique index: преобразует nonUnique: 0 в isUnique: true', () => {
      const rawTables = [createTableRow({ tableName: 'users' })];
      const rawColumns = [createColumnRow({ tableName: 'users', columnName: 'email', ordinalPosition: 1 })];
      const rawIndexes = [
        createIndexRow({
          tableName: 'users',
          indexName: 'uniq_users_email',
          columnName: 'email',
          nonUnique: 0,
        }),
      ];

      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
          tables: rawTables,
          columns: rawColumns,
          indexes: rawIndexes,
        }),
      );

      const userTable = snapshot.tables.find((t) => t.name === 'users');
      expect(userTable?.indexes[0]?.isUnique).toBe(true);
    });

    it('3b. Составной unique index: преобразует nonUnique: 0 в isUnique: true и сохраняет порядок частей', () => {
      const rawTables = [createTableRow({ tableName: 'memberships' })];
      const rawColumns = [
        createColumnRow({ tableName: 'memberships', columnName: 'org_id', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'memberships', columnName: 'user_id', ordinalPosition: 2 }),
      ];
      // Передаем строки с sequenceInIndex 2 перед 1
      const rawIndexes = [
        createIndexRow({
          tableName: 'memberships',
          indexName: 'uniq_org_user',
          columnName: 'user_id',
          sequenceInIndex: 2,
          nonUnique: 0,
        }),
        createIndexRow({
          tableName: 'memberships',
          indexName: 'uniq_org_user',
          columnName: 'org_id',
          sequenceInIndex: 1,
          nonUnique: 0,
        }),
      ];

      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
          tables: rawTables,
          columns: rawColumns,
          indexes: rawIndexes,
        }),
      );

      const table = snapshot.tables.find((t) => t.name === 'memberships');
      const uniqIndex = table?.indexes.find((i) => i.name === 'uniq_org_user');
      expect(uniqIndex).toBeDefined();
      expect(uniqIndex?.isUnique).toBe(true);
      expect(uniqIndex?.parts.map((p) => p.columnName)).toEqual(['org_id', 'user_id']);
    });

    it('4. Functional index: поддерживает выражение при columnName === null и формирует DBIndexExpressionPart', () => {
      const rawTables = [createTableRow({ tableName: 'users' })];
      const rawColumns = [createColumnRow({ tableName: 'users', columnName: 'email', ordinalPosition: 1 })];
      const rawIndexes = [
        createIndexRow({
          tableName: 'users',
          indexName: 'idx_expr_email',
          columnName: null,
          expression: 'lower(`email`)',
          sequenceInIndex: 1,
        }),
      ];

      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
          tables: rawTables,
          columns: rawColumns,
          indexes: rawIndexes,
        }),
      );

      const userTable = snapshot.tables.find((t) => t.name === 'users');
      expect(userTable?.indexes[0]?.parts[0]).toEqual({
        kind: 'expression',
        position: 1,
        columnName: null,
        expression: 'lower(`email`)',
        prefixLength: null,
        sortDirection: 'ASC',
      });
    });

    it('5. Prefix index с subPart: сохраняет subPart в prefixLength', () => {
      const rawTables = [createTableRow({ tableName: 'users' })];
      const rawColumns = [createColumnRow({ tableName: 'users', columnName: 'bio', ordinalPosition: 1 })];
      const rawIndexes = [
        createIndexRow({
          tableName: 'users',
          indexName: 'idx_users_bio_prefix',
          columnName: 'bio',
          subPart: 50,
        }),
      ];

      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
          tables: rawTables,
          columns: rawColumns,
          indexes: rawIndexes,
        }),
      );

      const userTable = snapshot.tables.find((t) => t.name === 'users');
      expect(userTable?.indexes[0]?.parts[0]?.prefixLength).toBe(50);
    });

    it('6. Collation маппинг: A → ASC, D → DESC, null → null', () => {
      const rawTables = [createTableRow({ tableName: 'test_table' })];
      const rawColumns = [
        createColumnRow({ tableName: 'test_table', columnName: 'col_asc', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'test_table', columnName: 'col_desc', ordinalPosition: 2 }),
        createColumnRow({ tableName: 'test_table', columnName: 'col_none', ordinalPosition: 3 }),
      ];
      const rawIndexes = [
        createIndexRow({
          tableName: 'test_table',
          indexName: 'idx_collation_test',
          columnName: 'col_asc',
          sequenceInIndex: 1,
          collation: 'A',
        }),
        createIndexRow({
          tableName: 'test_table',
          indexName: 'idx_collation_test',
          columnName: 'col_desc',
          sequenceInIndex: 2,
          collation: 'D',
        }),
        createIndexRow({
          tableName: 'test_table',
          indexName: 'idx_collation_test',
          columnName: 'col_none',
          sequenceInIndex: 3,
          collation: null,
        }),
      ];

      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
          tables: rawTables,
          columns: rawColumns,
          indexes: rawIndexes,
        }),
      );

      const table = snapshot.tables.find((t) => t.name === 'test_table');
      const parts = table?.indexes[0]?.parts;
      expect(parts?.[0]?.sortDirection).toBe('ASC');
      expect(parts?.[1]?.sortDirection).toBe('DESC');
      expect(parts?.[2]?.sortDirection).toBeNull();
    });

    it('7. Invisible index: преобразует isVisible "NO" в false, а "YES" в true', () => {
      const rawTables = [createTableRow({ tableName: 'users' })];
      const rawColumns = [
        createColumnRow({ tableName: 'users', columnName: 'col1', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'users', columnName: 'col2', ordinalPosition: 2 }),
      ];
      const rawIndexes = [
        createIndexRow({
          tableName: 'users',
          indexName: 'idx_hidden',
          columnName: 'col1',
          isVisible: 'NO',
        }),
        createIndexRow({
          tableName: 'users',
          indexName: 'idx_visible',
          columnName: 'col2',
          isVisible: 'YES',
        }),
      ];

      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
          tables: rawTables,
          columns: rawColumns,
          indexes: rawIndexes,
        }),
      );

      const userTable = snapshot.tables.find((t) => t.name === 'users');
      const hiddenIndex = userTable?.indexes.find((i) => i.name === 'idx_hidden');
      const visibleIndex = userTable?.indexes.find((i) => i.name === 'idx_visible');
      expect(hiddenIndex?.isVisible).toBe(false);
      expect(visibleIndex?.isVisible).toBe(true);
    });

    it('8. Индекс неизвестной таблицы: выбрасывает ошибку при отсутствии таблицы', () => {
      const rawIndexes = [
        createIndexRow({
          tableName: 'ghost_table',
          indexName: 'idx_test',
          columnName: 'id',
        }),
      ];

      expect(() =>
        schemaSnapshotBuilder(
          schemaName,
          scannedAt,
          createInformationSchemaRows({
            tables: [],
            columns: [],
            indexes: rawIndexes,
          }),
        ),
      ).toThrowError('Table ghost_table not found for index constraints');
    });

    it('9. Индекс неизвестной колонки: выбрасывает ошибку, если колонка не найдена в таблице', () => {
      const rawTables = [createTableRow({ tableName: 'users' })];
      const rawColumns = [createColumnRow({ tableName: 'users', columnName: 'id' })];
      const rawIndexes = [
        createIndexRow({
          tableName: 'users',
          indexName: 'idx_test',
          columnName: 'ghost_col',
        }),
      ];

      expect(() =>
        schemaSnapshotBuilder(
          schemaName,
          scannedAt,
          createInformationSchemaRows({
            tables: rawTables,
            columns: rawColumns,
            indexes: rawIndexes,
          }),
        ),
      ).toThrowError('Column ghost_col not found for table users');
    });

    it('10. Одновременно заполненные columnName и expression: выбрасывает ошибку', () => {
      const rawTables = [createTableRow({ tableName: 'users' })];
      const rawColumns = [createColumnRow({ tableName: 'users', columnName: 'email' })];
      const rawIndexes = [
        createIndexRow({
          tableName: 'users',
          indexName: 'idx_conflict_part',
          columnName: 'email',
          expression: 'lower(email)',
        }),
      ];

      expect(() =>
        schemaSnapshotBuilder(
          schemaName,
          scannedAt,
          createInformationSchemaRows({
            tables: rawTables,
            columns: rawColumns,
            indexes: rawIndexes,
          }),
        ),
      ).toThrowError(
        'Invalid index part for index idx_conflict_part: both column name and expression are null or not null',
      );
    });

    it('11. Оба значения null (columnName и expression): выбрасывает ошибку', () => {
      const rawTables = [createTableRow({ tableName: 'users' })];
      const rawColumns = [createColumnRow({ tableName: 'users', columnName: 'email' })];
      const rawIndexes = [
        createIndexRow({
          tableName: 'users',
          indexName: 'idx_null_part',
          columnName: null,
          expression: null,
        }),
      ];

      expect(() =>
        schemaSnapshotBuilder(
          schemaName,
          scannedAt,
          createInformationSchemaRows({
            tables: rawTables,
            columns: rawColumns,
            indexes: rawIndexes,
          }),
        ),
      ).toThrowError(
        'Invalid index part for index idx_null_part: both column name and expression are null or not null',
      );
    });

    it('12. Различающийся indexType внутри одной группы: выбрасывает ошибку неконсистентных метаданных', () => {
      const rawTables = [createTableRow({ tableName: 'users' })];
      const rawColumns = [
        createColumnRow({ tableName: 'users', columnName: 'col1', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'users', columnName: 'col2', ordinalPosition: 2 }),
      ];
      const rawIndexes = [
        createIndexRow({
          tableName: 'users',
          indexName: 'idx_diff_type',
          columnName: 'col1',
          sequenceInIndex: 1,
          indexType: 'BTREE',
        }),
        createIndexRow({
          tableName: 'users',
          indexName: 'idx_diff_type',
          columnName: 'col2',
          sequenceInIndex: 2,
          indexType: 'HASH',
        }),
      ];

      expect(() =>
        schemaSnapshotBuilder(
          schemaName,
          scannedAt,
          createInformationSchemaRows({
            tables: rawTables,
            columns: rawColumns,
            indexes: rawIndexes,
          }),
        ),
      ).toThrowError('Index constraint idx_diff_type has inconsistent metadata');
    });

    it('13. Functional index с пустым/whitespace expression: выбрасывает ошибку', () => {
      const rawTables = [createTableRow({ tableName: 'users' })];
      const rawColumns = [createColumnRow({ tableName: 'users', columnName: 'email' })];
      const rawIndexes = [
        createIndexRow({
          tableName: 'users',
          indexName: 'idx_empty_expr',
          columnName: null,
          expression: '   ',
        }),
      ];

      expect(() =>
        schemaSnapshotBuilder(
          schemaName,
          scannedAt,
          createInformationSchemaRows({
            tables: rawTables,
            columns: rawColumns,
            indexes: rawIndexes,
          }),
        ),
      ).toThrowError('Invalid index part for index idx_empty_expr: expression is empty');
    });

    it('14. Различающиеся nonUnique / isVisible / indexComment внутри одной группы: выбрасывает ошибку', () => {
      const rawTables = [createTableRow({ tableName: 'users' })];
      const rawColumns = [
        createColumnRow({ tableName: 'users', columnName: 'col1', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'users', columnName: 'col2', ordinalPosition: 2 }),
      ];

      // Различающийся nonUnique
      expect(() =>
        schemaSnapshotBuilder(
          schemaName,
          scannedAt,
          createInformationSchemaRows({
            tables: rawTables,
            columns: rawColumns,
            indexes: [
              createIndexRow({ tableName: 'users', indexName: 'idx_diff_unique', columnName: 'col1', sequenceInIndex: 1, nonUnique: 0 }),
              createIndexRow({ tableName: 'users', indexName: 'idx_diff_unique', columnName: 'col2', sequenceInIndex: 2, nonUnique: 1 }),
            ],
          }),
        ),
      ).toThrowError('Index constraint idx_diff_unique has inconsistent metadata');

      // Различающийся isVisible
      expect(() =>
        schemaSnapshotBuilder(
          schemaName,
          scannedAt,
          createInformationSchemaRows({
            tables: rawTables,
            columns: rawColumns,
            indexes: [
              createIndexRow({ tableName: 'users', indexName: 'idx_diff_visible', columnName: 'col1', sequenceInIndex: 1, isVisible: 'YES' }),
              createIndexRow({ tableName: 'users', indexName: 'idx_diff_visible', columnName: 'col2', sequenceInIndex: 2, isVisible: 'NO' }),
            ],
          }),
        ),
      ).toThrowError('Index constraint idx_diff_visible has inconsistent metadata');

      // Различающийся indexComment
      expect(() =>
        schemaSnapshotBuilder(
          schemaName,
          scannedAt,
          createInformationSchemaRows({
            tables: rawTables,
            columns: rawColumns,
            indexes: [
              createIndexRow({ tableName: 'users', indexName: 'idx_diff_comment', columnName: 'col1', sequenceInIndex: 1, indexComment: 'first' }),
              createIndexRow({ tableName: 'users', indexName: 'idx_diff_comment', columnName: 'col2', sequenceInIndex: 2, indexComment: 'second' }),
            ],
          }),
        ),
      ).toThrowError('Index constraint idx_diff_comment has inconsistent metadata');
    });

    it('15. Смешанный составной индекс (колонка + выражение): корректно создает части разного kind', () => {
      const rawTables = [createTableRow({ tableName: 'users' })];
      const rawColumns = [
        createColumnRow({ tableName: 'users', columnName: 'tenant_id', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'users', columnName: 'email', ordinalPosition: 2 }),
      ];
      const rawIndexes = [
        createIndexRow({
          tableName: 'users',
          indexName: 'idx_tenant_expr_email',
          columnName: 'tenant_id',
          sequenceInIndex: 1,
        }),
        createIndexRow({
          tableName: 'users',
          indexName: 'idx_tenant_expr_email',
          columnName: null,
          expression: 'lower(`email`)',
          sequenceInIndex: 2,
        }),
      ];

      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
          tables: rawTables,
          columns: rawColumns,
          indexes: rawIndexes,
        }),
      );

      const userTable = snapshot.tables.find((t) => t.name === 'users');
      expect(userTable?.indexes[0]?.parts).toEqual([
        {
          kind: 'column',
          position: 1,
          columnName: 'tenant_id',
          expression: null,
          prefixLength: null,
          sortDirection: 'ASC',
        },
        {
          kind: 'expression',
          position: 2,
          columnName: null,
          expression: 'lower(`email`)',
          prefixLength: null,
          sortDirection: 'ASC',
        },
      ]);
    });

    it('16. Сортирует индексы таблицы по алфавиту имени (localeCompare)', () => {
      const rawTables = [createTableRow({ tableName: 'users' })];
      const rawColumns = [
        createColumnRow({ tableName: 'users', columnName: 'col1', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'users', columnName: 'col2', ordinalPosition: 2 }),
        createColumnRow({ tableName: 'users', columnName: 'col3', ordinalPosition: 3 }),
      ];
      const rawIndexes = [
        createIndexRow({ tableName: 'users', indexName: 'idx_z', columnName: 'col1' }),
        createIndexRow({ tableName: 'users', indexName: 'idx_a', columnName: 'col2' }),
        createIndexRow({ tableName: 'users', indexName: 'idx_m', columnName: 'col3' }),
      ];

      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
          tables: rawTables,
          columns: rawColumns,
          indexes: rawIndexes,
        }),
      );

      const userTable = snapshot.tables.find((t) => t.name === 'users');
      expect(userTable?.indexes.map((idx) => idx.name)).toEqual(['idx_a', 'idx_m', 'idx_z']);
    });

    it('17. Комментарий индекса: сохраняет непустую строку и нормализует пустую строку в null', () => {
      const rawTables = [createTableRow({ tableName: 'users' })];
      const rawColumns = [
        createColumnRow({ tableName: 'users', columnName: 'col1', ordinalPosition: 1 }),
        createColumnRow({ tableName: 'users', columnName: 'col2', ordinalPosition: 2 }),
      ];
      const rawIndexes = [
        createIndexRow({
          tableName: 'users',
          indexName: 'idx_with_comment',
          columnName: 'col1',
          indexComment: 'Search index for user lookup',
        }),
        createIndexRow({
          tableName: 'users',
          indexName: 'idx_without_comment',
          columnName: 'col2',
          indexComment: '',
        }),
      ];

      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
          tables: rawTables,
          columns: rawColumns,
          indexes: rawIndexes,
        }),
      );

      const userTable = snapshot.tables.find((t) => t.name === 'users');
      const withComment = userTable?.indexes.find((i) => i.name === 'idx_with_comment');
      const withoutComment = userTable?.indexes.find((i) => i.name === 'idx_without_comment');

      expect(withComment?.comment).toBe('Search index for user lookup');
      expect(withoutComment?.comment).toBeNull();
    });
  });

  describe('Второстепенные граничные сценарии', () => {
    it('преобразует isNullable: "YES" в nullable: true', () => {
      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
          tables: [createTableRow({ tableName: 'posts' })],
          columns: [
            createColumnRow({
              tableName: 'posts',
              columnName: 'description',
              isNullable: 'YES',
            }),
          ],
        }),
      );

      const postTable = snapshot.tables.find((t) => t.name === 'posts');
      const descCol = postTable?.columns.find((c) => c.name === 'description');
      expect(descCol?.nullable).toBe(true);
    });

    it('сохраняет непустые комментарии для таблицы и колонки без изменений', () => {
      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
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
        }),
      );

      const accountTable = snapshot.tables.find((t) => t.name === 'accounts');
      const balanceCol = accountTable?.columns.find((c) => c.name === 'balance');

      expect(accountTable?.comment).toBe('Таблица пользовательских счетов');
      expect(balanceCol?.comment).toBe('Баланс в валюте');
    });

    it('сортирует таблицы по алфавиту и колонки по position (ordinalPosition)', () => {
      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
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
        }),
      );

      // Таблицы отсортированы по имени (localeCompare)
      expect(snapshot.tables.map((t) => t.name)).toEqual(['alpha', 'zebra']);

      // Колонки отсортированы по position
      const alphaTable = snapshot.tables.find((t) => t.name === 'alpha');
      expect(alphaTable?.columns.map((c) => c.name)).toEqual(['col_first', 'col_second']);
    });

    it('выбрасывает ошибку при неизвестном tableType', () => {
      expect(() =>
        schemaSnapshotBuilder(
          schemaName,
          scannedAt,
          createInformationSchemaRows({
            tables: [
              createTableRow({
                tableName: 'unknown_type_table',
                tableType: 'UNKNOWN',
              }),
            ],
          }),
        ),
      ).toThrowError(/Unknown table type: UNKNOWN/);
    });

    it('трактует generationExpression состоящее только из пробелов как не-generated (trimmedExpression !== "")', () => {
      const snapshot = schemaSnapshotBuilder(
        schemaName,
        scannedAt,
        createInformationSchemaRows({
          tables: [createTableRow({ tableName: 'test_table' })],
          columns: [
            createColumnRow({
              tableName: 'test_table',
              columnName: 'whitespace_expr',
              generationExpression: '   ',
            }),
          ],
        }),
      );

      const col = snapshot.tables[0]?.columns[0];
      expect(col?.generated.isGenerated).toBe(false);
      expect(col?.generated.generationExpression).toBeNull();
    });
  });
});
