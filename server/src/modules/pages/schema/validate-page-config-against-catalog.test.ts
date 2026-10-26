import { describe, expect, it } from 'vitest';
import type { SchemaCatalog, StoredField, StoredIndex } from '../../../core/schema-catalog';
import { createReadonlyCatalog } from '../../../core/schema-catalog/cache/schema-catalog.cache';
import { ApiError } from '../../../shared/api/errors/ApiError';
import { pageConfigSchema, type PageConfig } from './page-config.schema';
import { validatePageConfigAgainstCatalog } from './validate-page-config-against-catalog';

function field(id: number, resourceId = 42): StoredField {
    return {
        id, resourceId, name: `field_${id}`, position: id, dataType: 'int', columnType: 'int',
        nullable: false, defaultValue: null, characterMaximumLength: null,
        numericPrecision: 10, numericScale: 0, datetimePrecision: null,
        generated: { isGenerated: false, generationExpression: null }, autoIncrement: false,
        extra: '', characterSetName: null, collationName: null, comment: null,
        state: 'present', firstSeenScanId: 1, lastSeenScanId: 1,
    };
}

function index(fieldIds: number[], overrides: Partial<StoredIndex> = {}): StoredIndex {
    return {
        id: 1, resourceId: 42, name: 'PRIMARY', isUnique: true, indexType: 'BTREE',
        isVisible: true, comment: null, state: 'present', firstSeenScanId: 1, lastSeenScanId: 1,
        parts: fieldIds.map((fieldId, position) => ({
            id: position + 1, indexId: 1, position: position + 1, kind: 'column',
            fieldId, columnName: `field_${fieldId}`, expression: null,
            prefixLength: null, sortDirection: 'ASC',
        })),
        ...overrides,
    };
}

function fixture(): { config: PageConfig; catalog: SchemaCatalog } {
    return {
        config: pageConfigSchema.parse({
            schemaVersion: 1,
            source: { resourceId: 42, recordKey: [101] },
            fields: [{ id: 'total', fieldId: 102, label: 'Сумма', display: { type: 'number' } }],
            list: {
                columns: ['total'], sorting: { allowed: ['total'], default: [] },
                pagination: { defaultPageSize: 25, pageSizeOptions: [25] },
            },
        }),
        catalog: {
            schemaName: 'shop', fingerprint: 'snapshot', loadedAt: 1,
            resources: [{
                id: 42, schemaName: 'shop', tableName: 'orders', type: 'table', engine: 'InnoDB',
                comment: null, isServiceTable: false, state: 'present', firstSeenScanId: 1, lastSeenScanId: 1,
            }],
            fields: [field(101), field(102), field(103)], constraints: [], indexes: [index([101])],
        },
    };
}

// Контракт этого набора: PageConfig уже прошёл pageConfigSchema.
// Ключ первой версии — полный PRIMARY/UNIQUE по обычным NOT NULL колонкам.
// Порядок ID в recordKey не меняет уникальность набора; части ключа недостаточно.
describe('validatePageConfigAgainstCatalog', () => {
    it('accepts an existing primary key that is not displayed on the page', () => {
        const { config, catalog } = fixture();
        expect(() => validatePageConfigAgainstCatalog(config, catalog)).not.toThrow();
    });

    it('accepts a list without a record key, even if the table has no unique index', () => {
        const { config, catalog } = fixture();
        config.source.recordKey = null;
        catalog.indexes = [];
        expect(() => validatePageConfigAgainstCatalog(config, catalog)).not.toThrow();
    });

    it.each(['missing resource', 'foreign schema', 'service resource', 'deleted resource', 'missing field', 'foreign field', 'deleted field'])(
        'rejects %s with a client error', (scenario) => {
            const { config, catalog } = fixture();
            config.source.recordKey = null;
            if (scenario === 'missing resource') catalog.resources = [];
            if (scenario === 'foreign schema') catalog.resources[0].schemaName = 'another_database';
            if (scenario === 'service resource') catalog.resources[0].isServiceTable = true;
            if (scenario === 'deleted resource') catalog.resources[0].state = 'missing';
            if (scenario === 'missing field') config.fields[0].fieldId = 999;
            if (scenario === 'foreign field') catalog.fields[1].resourceId = 77;
            if (scenario === 'deleted field') catalog.fields[1].state = 'missing';
            expect(() => validatePageConfigAgainstCatalog(config, catalog)).toThrow(ApiError);
        },
    );

    it('accepts a displayed key using its catalog ID rather than its page element ID', () => {
        const { config, catalog } = fixture();
        config.fields.push({ id: 'orderNumber', fieldId: 101, label: 'Номер', display: { type: 'number' } });
        expect(() => validatePageConfigAgainstCatalog(config, catalog)).not.toThrow();
    });

    it.each([{ key: [101, 103] }, { key: [103, 101] }])('accepts a complete composite unique key $key', ({ key }) => {
        const { config, catalog } = fixture();
        config.source.recordKey = key;
        catalog.indexes = [index([101, 103], { name: 'unique_order' })];
        expect(() => validatePageConfigAgainstCatalog(config, catalog)).not.toThrow();
    });

    it.each(['unknown field', 'foreign field', 'deleted field', 'no unique index', 'partial composite key', 'deleted index', 'foreign index', 'nullable key', 'expression index'])(
        'rejects an unsuitable record key: %s', (scenario) => {
            const { config, catalog } = fixture();
            if (scenario === 'unknown field') config.source.recordKey = [999];
            if (scenario === 'foreign field') catalog.fields[0].resourceId = 77;
            if (scenario === 'deleted field') catalog.fields[0].state = 'missing';
            if (scenario === 'no unique index') catalog.indexes[0].isUnique = false;
            if (scenario === 'partial composite key') catalog.indexes = [index([101, 103])];
            if (scenario === 'deleted index') catalog.indexes[0].state = 'missing';
            if (scenario === 'foreign index') catalog.indexes[0].resourceId = 77;
            if (scenario === 'nullable key') catalog.fields[0].nullable = true;
            if (scenario === 'expression index') catalog.indexes[0].parts[0] = {
                id: 1, indexId: 1, position: 1, kind: 'expression', fieldId: null,
                columnName: null, expression: 'abs(field_101)', prefixLength: null, sortDirection: 'ASC',
            };
            expect(() => validatePageConfigAgainstCatalog(config, catalog)).toThrow(ApiError);
        },
    );

    it('searches all candidate indexes rather than only the first index of the resource', () => {
        const { config, catalog } = fixture();
        catalog.indexes.unshift(index([102], { id: 2, name: 'total_index', isUnique: false }));
        expect(() => validatePageConfigAgainstCatalog(config, catalog)).not.toThrow();
    });

    it.each(['extra field', 'different fields', 'separate indexes', 'prefix index', 'repeated index part'])(
        'rejects a record key that does not match one complete supported unique index: %s', (scenario) => {
            const { config, catalog } = fixture();
            if (scenario === 'extra field') config.source.recordKey = [101, 103];
            if (scenario === 'different fields') config.source.recordKey = [103];
            if (scenario === 'separate indexes') {
                config.source.recordKey = [101, 103];
                catalog.indexes.push(index([103], { id: 2, name: 'another_unique_key' }));
            }
            if (scenario === 'prefix index') catalog.indexes[0].parts[0].prefixLength = 10;
            if (scenario === 'repeated index part') {
                config.source.recordKey = [101, 103];
                catalog.indexes = [index([101, 101])];
            }
            expect(() => validatePageConfigAgainstCatalog(config, catalog)).toThrow(ApiError);
        },
    );

    it('accepts an invisible unique index because visibility does not remove uniqueness', () => {
        const { config, catalog } = fixture();
        catalog.indexes[0].isVisible = false;
        expect(() => validatePageConfigAgainstCatalog(config, catalog)).not.toThrow();
    });

    it('does not mutate either the configuration or a readonly cached catalog', () => {
        const { config, catalog } = fixture();
        const before = structuredClone(config);
        const cached = createReadonlyCatalog(catalog);
        expect(() => validatePageConfigAgainstCatalog(config, cached)).not.toThrow();
        expect(config).toEqual(before);
        expect(cached).toEqual(catalog);
    });
});
