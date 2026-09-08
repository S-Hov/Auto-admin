export interface DBSnapshot {
    name: string;
    scanTime: Date;
    tables: DBTable[];
}

export interface DBTable {
    name: string;
    type: 'table' | 'view';
    speakers: DBSpeaker[];
    primaryKey: string;
    uniqKeys: string[];
    foreignKeys: string[];
}

export interface DBSpeaker {
    name: string;
    position: number;
    columnType: string;
    nullable: boolean;
    default: unknown;
    generated: Date;
    autoIncrement: boolean;
}

export interface DBUnion {
    name: string;
    speakers: DBSpeaker[];
    type: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT'
}