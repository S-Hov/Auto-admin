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
    columnComment: string;
}

export interface InformationSchemaRows {
    tables: InformationSchemaTableRow[];
    columns: InformationSchemaColumnRow[];
    keyConstraints: InformationSchemaKeyConstraintRow[];
    foreignKeys: InformationSchemaForeignKeyRow[];
    indexes: InformationSchemaIndexRow[];
}

export interface InformationSchemaKeyConstraintRow extends RowDataPacket {
    tableName: string;
    constraintName: string;
    constraintType: 'PRIMARY KEY' | 'UNIQUE';
    columnName: string;
    ordinalPosition: number;
}

export interface InformationSchemaForeignKeyRow extends RowDataPacket {
    tableName: string;
    constraintName: string;
    columnName: string;
    ordinalPosition: number;
    referencedSchemaName: string;
    referencedTableName: string;
    referencedColumnName: string;
    updateRule: InformationSchemaReferentialAction;
    deleteRule: InformationSchemaReferentialAction;
}

export type InformationSchemaReferentialAction = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT';

export interface InformationSchemaIndexRow extends RowDataPacket {
    tableName: string;
    indexName: string;
    nonUnique: 0 | 1;
    sequenceInIndex: number;
    columnName: string | null;
    expression: string | null;
    indexType: string;
    collation: 'A' | 'D' | null;
    subPart: number | null;
    isVisible: 'YES' | 'NO';
    indexComment: string;
}