import type { InformationSchemaForeignKeyRow, InformationSchemaKeyConstraintRow, InformationSchemaRows } from "./information-schema.types";
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

    const groupedConstraints = new Map<
        string,
        Map<string, InformationSchemaKeyConstraintRow[]>
    >();

    for (const row of schema.keyConstraints) {
        let tableGroups = groupedConstraints.get(row.tableName);

        if (!tableGroups) {
            tableGroups = new Map();
            groupedConstraints.set(row.tableName, tableGroups);
        }

        let constraintRows = tableGroups.get(row.constraintName);

        if (!constraintRows) {
            constraintRows = [];
            tableGroups.set(row.constraintName, constraintRows);
        }

        constraintRows.push(row);
    }

    for (const [tableName, constraintsByName] of groupedConstraints) {
        const table = tablesMap.get(tableName);

        if (!table) {
            throw new Error(`Table ${tableName} not found for constraints`);
        }

        for (const [constraintName, rows] of constraintsByName) {
            for (const row of rows) {
                if (!table.columns.find(column => column.name === row.columnName)) {
                    throw new Error(`Column ${row.columnName} not found for table ${tableName}`);
                }
            }

            rows.sort((a, b) => a.ordinalPosition - b.ordinalPosition);

            const key = {
                name: constraintName,
                columns: rows.map(row => row.columnName),
            };

            const constraintType = rows[0]?.constraintType;

            if (!constraintType) {
                throw new Error(`Constraint ${constraintName} has no columns`);
            }

            switch (constraintType) {
                case 'PRIMARY KEY':
                    if (table.primaryKey !== null) {
                        throw new Error(`Table ${tableName} has multiple primary keys`);
                    }

                    table.primaryKey = key;
                    break;

                case 'UNIQUE':
                    table.uniqueKeys.push(key);
                    break;
            }
        }
    }

    const groupedForeignKeys = new Map<
        string,
        Map<string, InformationSchemaForeignKeyRow[]>
    >();

    for (const row of schema.foreignKeys) {
        let tableGroup = groupedForeignKeys.get(row.tableName);

        if (!tableGroup) {
            tableGroup = new Map();
            groupedForeignKeys.set(row.tableName, tableGroup);
        }

        let constraintRows = tableGroup.get(row.constraintName);

        if (!constraintRows) {
            constraintRows = [];
            tableGroup.set(row.constraintName, constraintRows);
        }

        constraintRows.push(row);
    }

    for (const [tableName, constraintsByName] of groupedForeignKeys) {
        const table = tablesMap.get(tableName);

        if (!table) {
            throw new Error(`Table ${tableName} not found for foreign key constraints`);
        }

        for (const [constraintName, rows] of constraintsByName) {
            for (const row of rows) {
                if (!table.columns.find(column => column.name === row.columnName)) {
                    throw new Error(`Column ${row.columnName} not found for table ${tableName}`);
                }
            }

            for (const row of rows) {
                if (row.referencedSchemaName === schemaName) {
                    const referencedTable = tablesMap.get(row.referencedTableName);
                    if (!referencedTable) {
                        throw new Error(`Table ${row.referencedTableName} not found for foreign key constraints`);
                    }
                    const referencedColumn = referencedTable.columns.find(column => column.name === row.referencedColumnName);
                    if (!referencedColumn) {
                        throw new Error(`Column ${row.referencedColumnName} not found for table ${row.referencedTableName}`);
                    }
                }
            }
            if (
                rows.some((elem) =>
                    elem.referencedSchemaName !== rows[0].referencedSchemaName
                    || elem.referencedTableName !== rows[0].referencedTableName
                    || elem.updateRule !== rows[0].updateRule
                    || elem.deleteRule !== rows[0].deleteRule
                )
            ) {
                throw new Error(`Foreign key constraint ${constraintName} has different referenced tables for different columns`);
            }

            rows.sort((a, b) => a.ordinalPosition - b.ordinalPosition);

            table.foreignKeys.push({
                name: constraintName,
                columns: rows.map(row => row.columnName),
                referencedSchemaName: rows[0].referencedSchemaName,
                referencedTableName: rows[0].referencedTableName,
                referencedColumns: rows.map(row => row.referencedColumnName),
                onUpdate: rows[0].updateRule,
                onDelete: rows[0].deleteRule,
            });
        }
    }

    tables.sort((a, b) => a.name.localeCompare(b.name));
    for (const table of tables) {
        table.columns.sort((a, b) => a.position - b.position);
        table.uniqueKeys.sort((a, b) => a.name.localeCompare(b.name));
        table.foreignKeys.sort((a, b) => a.name.localeCompare(b.name));
    }

    return {
        schemaName,
        scannedAt: time,
        tables,
    }
}