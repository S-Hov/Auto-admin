export interface DBSnapshot {
    name: string;
    scanTime: Date;
    tables: DBTable[];
}

export interface DBPrimary {
    name: "PRIMARY";
    columns: string[];
}

export interface DBUniq {
    name: string;
    columns: string[];
}

export type ForeignKeyAction = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT';

export interface DBForeign {
    name: string;
    columns: string[];
    refTableName: string;
    refColumns: string[];
    onUpdate: ForeignKeyAction;
    onDelete: ForeignKeyAction;
}

export interface DBTable {
    name: string;
    type: 'table' | 'view';
    columns: DBColumn[];
    primaryKey: DBPrimary | null;
    uniqueKeys: DBUniq[];
    foreignKeys: DBForeign[];
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
    default: string | null;
    generated: DBGenerated;
    autoIncrement: boolean;
}

export interface DBUnion {
    name: string;
    columns: Extract<DBColumn, 'name'>[];
    onDelete: ForeignKeyAction;
    onUpdate: ForeignKeyAction;
    type: 'LEFT' | 'RIGHT' | 'INNER' | 'OUTER';
}