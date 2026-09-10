import { envConfig } from "../../config/env";
import type { DbExecutor } from "../../db";
import type { InformationSchemaColumnRow, InformationSchemaTableRow } from "./information-schema.types";

const readTableRows = async (executor: DbExecutor, schemaName: string): Promise<InformationSchemaTableRow[]> => {
    const [rows] = await executor.query<InformationSchemaTableRow[]>(`
        SELECT 
            TABLE_SCHEMA AS schemaName,
            TABLE_NAME AS tableName,
            TABLE_TYPE AS tableType,
            ENGINE AS engine,
            TABLE_COMMENT AS tableComment
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME
    `, [schemaName]);

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
