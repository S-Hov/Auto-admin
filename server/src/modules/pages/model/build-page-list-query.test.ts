import { describe, expect, it } from 'vitest';
import { catalog as makeCatalog, field } from '../../../../tests/fixtures/access.fixture';
import { createReadonlyCatalog } from '../../../core/schema-catalog/cache/schema-catalog.cache';
import type { PageConfig } from '@auto-admin/contracts/pages';
import { parseUnifiedQuery } from '../../../core/query-engine/schema/query.schema';
import { buildPageListQuery } from './build-page-list-query';
import { analyzeQueryAccess } from '../../../core/query-engine/access/query-access.analyzer';
import { MySqlCompiler } from '../../../core/query-engine/providers/mysql/mysql-query.compiler';
import { mapPageListRows } from './map-page-list-rows';

function fixture() {
    const catalog = makeCatalog();
    catalog.fields = [
        field(101, 1, 'id'), field(102, 1, 'total_amount'),
        field(103, 1, 'created_at', { dataType: 'datetime', columnType: 'datetime' }),
        field(104, 1, 'comment', { dataType: 'text', columnType: 'text' }),
    ];
    catalog.indexes = [{
        id: 1, resourceId: 1, name: 'PRIMARY', isUnique: true, indexType: 'BTREE', isVisible: true,
        comment: null, state: 'present', firstSeenScanId: 1, lastSeenScanId: 1,
        parts: [{ id: 1, indexId: 1, position: 1, kind: 'column', fieldId: 101,
            columnName: 'id', expression: null, prefixLength: null, sortDirection: 'ASC' }],
    }];
    const config: PageConfig = {
        schemaVersion: 1,
        source: { resourceId: 1, recordKey: [101] },
        fields: [
            { id: 'total', fieldId: 102, label: 'Сумма', display: { type: 'number' } },
            { id: 'createdAt', fieldId: 103, label: 'Дата', display: { type: 'datetime' } },
            { id: 'comment', fieldId: 104, label: 'Комментарий', display: { type: 'text' } },
        ],
        list: {
            columns: ['createdAt', 'total'],
            sorting: { allowed: ['total', 'createdAt'], default: [{ field: 'createdAt', direction: 'desc' }] },
            pagination: { defaultPageSize: 25, pageSizeOptions: [10, 25, 50] },
        },
        detail: { groups: [{ id: 'extra', label: 'Дополнительно', fields: ['comment'] }] },
    };
    return { config, catalog };
}

describe('buildPageListQuery', () => {
    it('carries qualified columns through access analysis, SQL aliases and page rows', () => {
        const { config, catalog } = fixture();
        catalog.fields.push(field(201, 2, 'id'));
        config.joins = [{ alias: 'users', resourceId: 2, type: 'LEFT', on: [{ leftFieldId: 102, rightFieldId: 201 }] }];
        config.fields.push(
            { id: 'order', column: 'orders.id', fieldId: 101, label: 'Order ID', display: { type: 'number' } },
            { id: 'user', column: 'users.id', fieldId: 201, label: 'User ID', display: { type: 'number' } },
        );
        config.list.columns = ['order', 'user'];
        const cached = createReadonlyCatalog(catalog);
        const result = analyzeQueryAccess(parseUnifiedQuery(buildPageListQuery(config, cached, { offset: 0 })), cached);
        const sql = new MySqlCompiler().compile(result.query).sql;
        expect(sql).toContain('SELECT `orders`.`id` AS `orders.id`, `users`.`id` AS `users.id`');
        expect(sql).toContain('LEFT JOIN `shop`.`users` AS `users` ON `orders`.`total_amount` = `users`.`id`');
        expect(result.requirements.fields).toEqual(expect.arrayContaining([
            expect.objectContaining({ fieldId: 102, usage: 'join' }),
            expect.objectContaining({ fieldId: 201, usage: 'join' }),
        ]));
        expect(mapPageListRows(config, cached, [{ 'orders.id': 4, 'users.id': null }])).toEqual([{ order: 4, user: null }]);
    });

    it('rejects a field whose qualifier and catalog resource disagree', () => {
        const { config, catalog } = fixture();
        catalog.fields.push(field(201, 2, 'id'));
        config.joins = [{ alias: 'users', resourceId: 2, type: 'INNER', on: [{ leftFieldId: 102, rightFieldId: 201 }] }];
        config.fields[0].column = 'users.id';
        expect(() => buildPageListQuery(config, createReadonlyCatalog(catalog), { offset: 0 })).toThrowError(expect.objectContaining({
            details: [{ field: 'config.fields.0.fieldId', code: 'PAGE.FIELD_RESOURCE_MISMATCH' }],
        }));
    });

    it('uses separate aliases when the same table is joined twice in a chain', () => {
        const { config, catalog } = fixture();
        catalog.fields.push(field(201, 2, 'id'), field(202, 2, 'manager_id'));
        config.joins = [
            { alias: 'author', resourceId: 2, type: 'LEFT', on: [{ leftFieldId: 102, rightFieldId: 201 }] },
            { alias: 'manager', resourceId: 2, from: 'author', type: 'RIGHT', on: [{ leftFieldId: 202, rightFieldId: 201 }] },
        ];
        config.fields.push(
            { id: 'authorId', column: 'author.id', fieldId: 201, label: 'Author', display: { type: 'number' } },
            { id: 'managerId', column: 'manager.id', fieldId: 201, label: 'Manager', display: { type: 'number' } },
        );
        config.list.columns = ['authorId', 'managerId'];
        const cached = createReadonlyCatalog(catalog);
        const result = analyzeQueryAccess(parseUnifiedQuery(buildPageListQuery(config, cached, { offset: 0 })), cached);
        const sql = new MySqlCompiler().compile(result.query).sql;
        expect(sql).toContain('RIGHT JOIN `shop`.`users` AS `manager` ON `author`.`manager_id` = `manager`.`id`');
        expect(mapPageListRows(config, cached, [{ 'author.id': null, 'manager.id': 7 }])).toEqual([{ authorId: null, managerId: 7 }]);
    });
    it('selects only list columns in configured order and resolves all catalog identifiers', () => {
        const { config, catalog } = fixture();
        const query = buildPageListQuery(config, catalog, { offset: 0 });
        expect(query).toEqual({
            action: 'read', table: 'shop.orders', select: ['created_at', 'total_amount'],
            sort: [{ field: 'created_at', direction: 'desc' }, { field: 'id', direction: 'asc' }],
            limit: 25, offset: 0,
        });
        expect(query).not.toHaveProperty('where');
        expect(() => parseUnifiedQuery(query)).not.toThrow();
    });
    it('maps a user sort ID to its database column and overrides default sorting', () => {
        const { config, catalog } = fixture();
        const query = buildPageListQuery(config, catalog, { limit: 50, offset: 150, sort: { field: 'total', direction: 'asc' } });
        expect(query).toMatchObject({ limit: 50, offset: 150, sort: [{ field: 'total_amount', direction: 'asc' }, { field: 'id', direction: 'asc' }] });
    });
    it.each(['comment', 'total_amount', 'missing'])('rejects unauthorized or unknown sort ID %s', (id) => {
        const { config, catalog } = fixture();
        expect(() => buildPageListQuery(config, catalog, { offset: 0, sort: { field: id, direction: 'asc' } })).toThrowError(expect.objectContaining({
            status: 400, details: [{ field: 'sort.field', code: 'VALIDATION.INVALID_VALUE' }],
        }));
    });
    it('preserves all default sorting criteria', () => {
        const { config, catalog } = fixture();
        config.list.sorting.default.push({ field: 'total', direction: 'asc' });
        expect(buildPageListQuery(config, catalog, { offset: 0 }).sort).toEqual([
            { field: 'created_at', direction: 'desc' }, { field: 'total_amount', direction: 'asc' }, { field: 'id', direction: 'asc' },
        ]);
    });
    it('does not duplicate key sorting or override its chosen direction', () => {
        const { config, catalog } = fixture();
        config.fields.push({ id: 'orderNumber', fieldId: 101, label: 'Номер', display: { type: 'number' } });
        config.list.sorting.allowed.push('orderNumber');
        expect(buildPageListQuery(config, catalog, { offset: 0, sort: { field: 'orderNumber', direction: 'desc' } }).sort)
            .toEqual([{ field: 'id', direction: 'desc' }]);
    });
    it('appends every part of a composite record key', () => {
        const { config, catalog } = fixture();
        config.source.recordKey = [101, 102];
        catalog.indexes[0].parts.push({ ...catalog.indexes[0].parts[0], id: 2, position: 2, fieldId: 102, columnName: 'total_amount' });
        expect(buildPageListQuery(config, catalog, { offset: 0 }).sort).toEqual([
            { field: 'created_at', direction: 'desc' }, { field: 'id', direction: 'asc' }, { field: 'total_amount', direction: 'asc' },
        ]);
    });
    it('supports a list without a key or sorting and never selects all columns implicitly', () => {
        const { config, catalog } = fixture();
        config.source.recordKey = null;
        delete config.detail;
        config.list.sorting.default = [];
        const query = buildPageListQuery(config, catalog, { offset: 0 });
        expect(query).not.toHaveProperty('sort');
        expect(query.select).toEqual(['created_at', 'total_amount']);
    });
    it('rejects a valid global limit that is not offered by this page', () => {
        const { config, catalog } = fixture();
        expect(() => buildPageListQuery(config, catalog, { offset: 0, limit: 30 })).toThrowError(expect.objectContaining({
            status: 400, details: [{ field: 'limit', code: 'VALIDATION.INVALID_VALUE' }],
        }));
    });
    it('does not silently skip a broken list reference or an empty selection', () => {
        const { config, catalog } = fixture();
        config.list.columns = ['missing'];
        expect(() => buildPageListQuery(config, catalog, { offset: 0 })).toThrow();
        config.list.columns = [];
        expect(() => buildPageListQuery(config, catalog, { offset: 0 })).toThrow();
    });
    it('validates the catalog and preserves all inputs', () => {
        const { config, catalog } = fixture();
        const before = structuredClone(config);
        const params = { offset: 50, limit: 10 };
        buildPageListQuery(config, createReadonlyCatalog(catalog), params);
        expect(config).toEqual(before);
        expect(params).toEqual({ offset: 50, limit: 10 });
        catalog.fields[1].state = 'missing';
        expect(() => buildPageListQuery(config, catalog, params)).toThrow();
    });
});
