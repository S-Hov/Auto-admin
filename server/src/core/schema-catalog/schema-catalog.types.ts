export interface DBSnapshot {
    schemaName: string;
    scannedAt: Date;
    tables: DBTable[];
}

export interface DBKey {
    name: string;
    columns: string[];
}

export type ForeignKeyAction = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT';

export interface DBForeignKey {
    name: string;
    columns: string[];
    referencedTableName: string;
    referencedSchemaName: string;
    referencedColumns: string[];
    onUpdate: ForeignKeyAction;
    onDelete: ForeignKeyAction;
}

export interface DBTable {
    name: string;
    type: 'table' | 'view';
    engine: string | null;
    columns: DBColumn[];
    primaryKey: DBKey | null;
    uniqueKeys: DBKey[];
    foreignKeys: DBForeignKey[];
    isServiceTable: boolean;
    comment: string | null;
    indexes: DBIndex[];
}

export interface DBGenerated {
    isGenerated: boolean;
    generationExpression: string | null;
}

export interface DBColumn {
    name: string;
    position: number;
    dataType: string;
    characterMaximumLength: number | null;
    numericPrecision: number | null;
    numericScale: number | null;
    datetimePrecision: number | null;
    columnType: string;
    nullable: boolean;
    defaultValue: string | null;
    generated: DBGenerated;
    autoIncrement: boolean;
    extra: string;
    characterSetName: string | null;
    collationName: string | null;
    comment: string | null;
}

export interface DBIndex {
    name: string;
    parts: DBIndexPart[];
    isUnique: boolean;
    indexType: string;
    isVisible: boolean;
    comment: string | null;
}

export type DBIndexPart = DBIndexColumnPart | DBIndexExpressionPart;

interface DBIndexPartBase {
    position: number;
    prefixLength: number | null;
    sortDirection: 'ASC' | 'DESC' | null;
}

interface DBIndexColumnPart extends DBIndexPartBase {
    kind: 'column';
    columnName: string;
    expression: null;
}

interface DBIndexExpressionPart extends DBIndexPartBase {
    kind: 'expression';
    columnName: null;
    expression: string;
}