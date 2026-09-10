import type { InformationSchemaRows } from "./information-schema.types";
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

    tables.sort((a, b) => a.name.localeCompare(b.name));
    for (const table of tables) {
        table.columns.sort((a, b) => a.position - b.position);
    }

    return {
        schemaName,
        scannedAt: time,
        tables,
    }
}