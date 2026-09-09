import type { RowDataPacket } from 'mysql2/promise';

export interface InformationSchemaTableRow extends RowDataPacket {
    schemaName: string;
    tableName: string;
    tableType: 'BASE TABLE' | 'VIEW';
    engine: string | null;
    tableComment: string;
}

export interface InformationSchemaColumnRow extends RowDataPacket {
    tableName: string;
    columnName: string;
    ordinalPosition: number;
    columnDefault: string | null;
    isNullable: 'YES' | 'NO';
    dataType: string;
    characterMaximumLength: number | null;
    numericPrecision: number | null;
    numericScale: number | null;
    datetimePrecision: number | null;
    columnType: string;
    extra: string;
    generationExpression: string;
    characterSetName: string | null;
    collationName: string | null;
    columnComment: string | null;
}
