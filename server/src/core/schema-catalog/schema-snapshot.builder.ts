import { logger } from "../../shared/logger";
import type { InformationSchemaRows } from "./information-schema.types";
import type { DBSnapshot, DBTable } from "./schema-catalog.types";

export const schemaSnapshotBuilder = async (schemaName: string, time: Date, schema: InformationSchemaRows): Promise<DBSnapshot> => {
    const tables: DBTable[] = [];
    for (const table of schema.tables) {
        tables.push({
            name: table.tableName,
            type: table.tableType === 'BASE TABLE' ? 'table' : 'view',
            engine: table.engine,
            columns: [],
            primaryKey: null,
            uniqueKeys: [],
            foreignKeys: [],
            isServiceTable: table.tableName.startsWith("Auto_Admin__") ? true : false,
            comment: table.tableComment || null,
            indexes: [],
        })
    }

    for (const column of schema.columns) {
        const table = tables.find(t => t.name === column.tableName);
        if (!table) {
            logger.info({
                columnName: column.columnName,
                tableName: column.tableName,
            }, `Table not found for column`);
            continue;
        }
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
                isGenerated: column.generationExpression !== null,
                generationExpression: column.generationExpression,
            },
            autoIncrement: column.extra.includes('auto_increment'),
            extra: column.extra,
            characterSetName: column.characterSetName,
            collationName: column.collationName,
            comment: column.columnComment || null,
        })
    }

    return {
        schemaName,
        scannedAt: time,
        tables: [],
    }
}