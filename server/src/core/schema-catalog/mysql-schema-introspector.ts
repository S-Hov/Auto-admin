import { envConfig } from "../../config/env";
import type { DbExecutor } from "../../db";
import type { InformationSchemaColumnRow, InformationSchemaKeyConstraintRow, InformationSchemaRows, InformationSchemaTableRow } from "./information-schema.types";
import { SERVICES_TABLE_PREFIX } from "./schema-catalog.constants";

const readTableRows = async (executor: DbExecutor, schemaName: string): Promise<InformationSchemaTableRow[]> => {
    const [rows] = await executor.query<InformationSchemaTableRow[]>({
        sql: `
            SELECT 
                TABLE_SCHEMA AS schemaName,
                TABLE_NAME AS tableName,
                TABLE_TYPE AS tableType,
                ENGINE AS engine,
                TABLE_COMMENT AS tableComment
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = ?
            ORDER BY TABLE_NAME
        `,
        timeout: envConfig.Auto_Admin__DB_QUERY_TIMEOUT_MS,
        values: [schemaName],
    });

    return rows;
}

const readColumnRows = async (executor: DbExecutor, schemaName: string): Promise<InformationSchemaColumnRow[]> => {
    const [rows] = await executor.query<InformationSchemaColumnRow[]>({
        sql: `
            SELECT
                TABLE_NAME AS tableName,
                COLUMN_NAME AS columnName,
                ORDINAL_POSITION AS ordinalPosition,
                COLUMN_DEFAULT AS columnDefault,
                IS_NULLABLE AS isNullable,
                DATA_TYPE AS dataType,
                CHARACTER_MAXIMUM_LENGTH AS characterMaximumLength,
                NUMERIC_PRECISION AS numericPrecision,
                NUMERIC_SCALE AS numericScale,
                DATETIME_PRECISION AS datetimePrecision,
                COLUMN_TYPE AS columnType,
                EXTRA AS extra,
                GENERATION_EXPRESSION AS generationExpression,
                CHARACTER_SET_NAME AS characterSetName,
                COLLATION_NAME AS collationName,
                COLUMN_COMMENT AS columnComment
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ?
            ORDER BY TABLE_NAME, ORDINAL_POSITION
        `,
        timeout: envConfig.Auto_Admin__DB_QUERY_TIMEOUT_MS,
        values: [schemaName],
    });

    return rows;
}

const readKeyConstraintRows = async (executor: DbExecutor, schemaName: string): Promise<InformationSchemaKeyConstraintRow[]> => {
    const [rows] = await executor.query<InformationSchemaKeyConstraintRow[]>({
        sql: `
            SELECT
                TABLE_NAME AS tableName,
                CONSTRAINT_NAME AS constraintName,
                CONSTRAINT_TYPE AS constraintType,
                COLUMN_NAME AS columnName,
                ORDINAL_POSITION AS ordinalPosition
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = ?
            AND CONSTRAINT_TYPE IN ('PRIMARY KEY', 'UNIQUE')
            AND TABLE_NAME NOT LIKE ?
            ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION
        `,
        timeout: envConfig.Auto_Admin__DB_QUERY_TIMEOUT_MS,
        values: [schemaName, `${SERVICES_TABLE_PREFIX}%`],
    });

    return rows;
}

export const readInformationSchemaRows = async (executor: DbExecutor, schemaName: string): Promise<InformationSchemaRows> => {
    const [tables, columns, keyConstraints] = await Promise.all([
        readTableRows(executor, schemaName),
        readColumnRows(executor, schemaName),
        readKeyConstraintRows(executor, schemaName),
    ]);

    return { tables, columns, keyConstraints };
}