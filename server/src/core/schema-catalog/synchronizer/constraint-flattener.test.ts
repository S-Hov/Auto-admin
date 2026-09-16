import { describe, expect, it } from 'vitest';
import type { DBTable } from '../types/schema-catalog.types';
import { flattenSnapshotConstraints } from './constraint-flattener';

const createTable = (overrides: Partial<DBTable> = {}): DBTable => ({
    name: 'orders',
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

describe('flattenSnapshotConstraints', () => {
    it('flattens a composite primary key and preserves column order', () => {
        const table = createTable({
            primaryKey: {
                name: 'PRIMARY',
                columns: ['tenant_id', 'order_id'],
            },
        });

        expect(flattenSnapshotConstraints([table])).toEqual([{
            tableName: 'orders',
            constraintName: 'PRIMARY',
            type: 'primary',
            fields: [
                { position: 1, columnName: 'tenant_id', referencedColumnName: null },
                { position: 2, columnName: 'order_id', referencedColumnName: null },
            ],
            referencedSchemaName: null,
            referencedTableName: null,
            onUpdate: null,
            onDelete: null,
        }]);
    });

    it('flattens every unique key', () => {
        const table = createTable({
            uniqueKeys: [
                { name: 'uq_orders_number', columns: ['order_number'] },
                { name: 'uq_orders_external', columns: ['tenant_id', 'external_id'] },
            ],
        });

        const constraints = flattenSnapshotConstraints([table]);

        expect(constraints.map((constraint) => constraint.constraintName)).toEqual([
            'uq_orders_number',
            'uq_orders_external',
        ]);
        expect(constraints[1]?.fields).toEqual([
            { position: 1, columnName: 'tenant_id', referencedColumnName: null },
            { position: 2, columnName: 'external_id', referencedColumnName: null },
        ]);
    });

    it('pairs local and referenced columns of a composite foreign key by position', () => {
        const table = createTable({
            foreignKeys: [{
                name: 'fk_orders_user',
                columns: ['tenant_id', 'user_id'],
                referencedSchemaName: 'shop',
                referencedTableName: 'users',
                referencedColumns: ['tenant_id', 'id'],
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
            }],
        });

        expect(flattenSnapshotConstraints([table])).toEqual([{
            tableName: 'orders',
            constraintName: 'fk_orders_user',
            type: 'foreign',
            fields: [
                { position: 1, columnName: 'tenant_id', referencedColumnName: 'tenant_id' },
                { position: 2, columnName: 'user_id', referencedColumnName: 'id' },
            ],
            referencedSchemaName: 'shop',
            referencedTableName: 'users',
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
        }]);
    });

    it('rejects a foreign key with unpaired columns', () => {
        const table = createTable({
            foreignKeys: [{
                name: 'fk_orders_user',
                columns: ['tenant_id', 'user_id'],
                referencedSchemaName: 'shop',
                referencedTableName: 'users',
                referencedColumns: ['id'],
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
            }],
        });

        expect(() => flattenSnapshotConstraints([table])).toThrow(/inconsistent column pairs/i);
    });
});
