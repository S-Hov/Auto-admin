import type { InformationSchemaKeyConstraintRow, InformationSchemaRows } from "./information-schema.types";
import { SERVICES_TABLE_PREFIX } from "./schema-catalog.constants";
import type { DBSnapshot, DBTable } from "./schema-catalog.types";

export const schemaSnapshotBuilder = (schemaName: string, time: Date, schema: InformationSchemaRows): DBSnapshot => {
    const tables: DBTable[] = [];
    const tablesMap = new Map<string, DBTable>();
    for (const table of schema.tables) {
        const tableType = (() => {
            switch (table.tableType) {
                case 'BASE TABLE':
                    return 'table';
                case 'VIEW':
                    return 'view';
                default:
                    throw new Error(`Unknown table type: ${table.tableType}`);
            }
        })();
        const DBtable: DBTable = {
            name: table.tableName,
            type: tableType,
            engine: table.engine,
            columns: [],
            primaryKey: null,
            uniqueKeys: [],
            foreignKeys: [],
            isServiceTable: table.tableName.startsWith(SERVICES_TABLE_PREFIX),
            comment: table.tableComment || null,
            indexes: [],
        }
        tables.push(DBtable);
        tablesMap.set(table.tableName, DBtable);
    }

    for (const column of schema.columns) {
        const table = tablesMap.get(column.tableName);
        if (!table) {
            throw new Error(`Table ${column.tableName} not found for column ${column.columnName}`);
        }
        const trimmedExpression = column.generationExpression.trim()
        table.columns.push({
            name: column.columnName,
            position: column.ordinalPosition,
            dataType: column.dataType,
            characterMaximumLength: column.characterMaximumLength,
            numericPrecision: column.numericPrecision,
            numericScale: column.numericScale,
            datetimePrecision: column.datetimePrecision,
            columnType: column.columnType,
            nullable: column.isNullable === 'YES' ? true : false,
            defaultValue: column.columnDefault,
            generated: {
                isGenerated: trimmedExpression !== '',
                generationExpression: trimmedExpression || null,
            },
            autoIncrement: column.extra.toLowerCase().includes('auto_increment'),
            extra: column.extra,
            characterSetName: column.characterSetName,
            collationName: column.collationName,
            comment: column.columnComment || null,
        })
    }

    const constraints = [...schema.keyConstraints];
    const groupedConstraints = constraints.reduce((acc: Record<string, InformationSchemaKeyConstraintRow[]>, item: InformationSchemaKeyConstraintRow) => {
        const existing = acc[item.tableName];
        if (existing) {
            existing.push(item);
        } else {
            acc[item.tableName] = [item];
        }
        return acc;
    }, {});

    for (const key of Object.values(groupedConstraints)) {
        key.sort((a, b) => a.ordinalPosition - b.ordinalPosition);
    }

    for (const table of tables) {
        const tableConstraints = groupedConstraints[table.name];
        if (!tableConstraints) {
            throw new Error(`Table ${table.name} not found for constraints`);
        }
        const primaryKey = tableConstraints.find(c => c.constraintType === 'PRIMARY KEY');
        if (primaryKey) {
            table.primaryKey = {
                name: primaryKey.constraintName,
                columns: tableConstraints.filter(c => c.constraintType === 'PRIMARY KEY').map(c => c.columnName),
            };
        }else{
            throw new Error(`Table ${table.name} has no primary key`);
        }
        table.uniqueKeys = tableConstraints.filter(c => c.constraintType === 'UNIQUE').map(c => ({
            name: c.constraintName,
            columns: tableConstraints.filter(c => c.constraintType === 'UNIQUE').map(c => c.columnName),
        }));
    }

    tables.sort((a, b) => a.name.localeCompare(b.name));
    for (const table of tables) {
        table.columns.sort((a, b) => a.position - b.position);
        table.uniqueKeys.sort((a, b) => a.name.localeCompare(b.name));
    }

    return {
        schemaName,
        scannedAt: time,
        tables,
    }
}