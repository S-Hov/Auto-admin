export interface DBSnapshot {
    name: string;
    scanTime: Date;
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
    referencedColumns: string[];
    onUpdate: ForeignKeyAction;
    onDelete: ForeignKeyAction;
}

export interface DBTable {
    name: string;
    type: 'table' | 'view';
    columns: DBColumn[];
    primaryKey: DBKey | null;
    uniqueKeys: DBKey[];
    foreignKeys: DBForeignKey[];
    isServiceTable: boolean;
}

export interface DBGenerated {
    isGenerated: boolean;
    generationExpression: string | null;
}

export interface DBColumn {
    name: string;
    position: number;
    dataType: string;
    columnType: string;
    nullable: boolean;
    defaultValue: string | null;
    generated: DBGenerated;
    autoIncrement: boolean;
}
