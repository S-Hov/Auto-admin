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

export interface DBIndexPartBase {
    position: number;
    prefixLength: number | null;
    sortDirection: 'ASC' | 'DESC' | null;
}

export interface DBIndexColumnPart extends DBIndexPartBase {
    kind: 'column';
    columnName: string;
    expression: null;
}

export interface DBIndexExpressionPart extends DBIndexPartBase {
    kind: 'expression';
    columnName: null;
    expression: string;
}

export interface SchemaScanChangeCounts {
    addedResources: number;
    changedResources: number;
    missingResources: number;
    addedFields: number;
    changedFields: number;
    missingFields: number;
}

export interface StoredResource {
    id: number;
    schemaName: string;
    tableName: string;
    type: 'table' | 'view';
    engine: string | null;
    comment: string | null;
    isServiceTable: boolean;
    state: 'present' | 'missing';
    firstSeenScanId: number;
    lastSeenScanId: number;
}

export interface StoredField extends DBColumn {
    id: number;
    resourceId: number;
    state: 'present' | 'missing';
    firstSeenScanId: number;
    lastSeenScanId: number;
}

export interface StoredConstraint {
    id: number;
    resourceId: number;
    constraintName: string;
    type: 'primary' | 'unique' | 'foreign';
    referencedTableName: string | null;
    referencedSchemaName: string | null;
    referencedResourceId: number | null;
    onUpdate: ForeignKeyAction | null;
    onDelete: ForeignKeyAction | null;
    state: 'present' | 'missing';
    firstSeenScanId: number;
    lastSeenScanId: number;
    fields: StoredConstraintField[];
}

export interface StoredConstraintField {
    id: number;
    constraintId: number;
    position: number;
    fieldId: number;
    columnName: string;
    referencedColumnName: string | null;
    referencedFieldId: number | null;
}

export interface StoredIndex {
    id: number;
    resourceId: number;
    name: string;
    isUnique: boolean;
    indexType: string;
    isVisible: boolean;
    comment: string | null;
    state: 'present' | 'missing';
    firstSeenScanId: number;
    lastSeenScanId: number;
    parts: StoredIndexPart[];
}

export type StoredIndexPart = StoredIndexColumnPart | StoredIndexExpressionPart;

interface StoredIndexPartBase extends DBIndexPartBase {
    id: number;
    indexId: number;
}

export interface StoredIndexColumnPart extends StoredIndexPartBase {
    kind: 'column';
    fieldId: number;
    columnName: string;
    expression: null;
}

export interface StoredIndexExpressionPart extends StoredIndexPartBase {
    kind: 'expression';
    fieldId: null;
    columnName: null;
    expression: string;
}

export interface SchemaCatalog {
    schemaName: string;
    fingerprint: string;
    loadedAt: number;
    resources: StoredResource[];
    fields: StoredField[];
    constraints: StoredConstraint[];
    indexes: StoredIndex[];
}

export interface SchemaScanResult {
    scanId: number;
    fingerprint: string;
    counts: SchemaScanChangeCounts;
    catalog: SchemaCatalog;
}
