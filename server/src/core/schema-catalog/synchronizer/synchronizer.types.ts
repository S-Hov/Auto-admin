import { InformationSchemaReferentialAction } from '../types/information-schema.types';
import type { DBColumn, DBTable, StoredField, StoredResource } from '../types/schema-catalog.types';

export interface MatchedResource {
    snapshot: DBTable;
    stored: StoredResource;
}

export interface ResourceDiff {
    added: DBTable[];
    changed: MatchedResource[];
    unchanged: MatchedResource[];
    missing: StoredResource[];
}

export interface SnapshotFieldRef {
    tableName: string;
    column: DBColumn;
}

export interface MatchedField {
    snapshot: DBColumn;
    stored: StoredField;
}

export interface FieldDiff {
    added: SnapshotFieldRef[];
    changed: MatchedField[];
    unchanged: MatchedField[];
    missing: StoredField[];
}

export interface SnapshotConstraintRef {
    tableName: string;
    constraintName: string;
    type: 'primary' | 'unique' | 'foreign';
    columns: DBColumn[];
    referencedSchemaName: string;
    referencedTableName: string;
    onUpdate: InformationSchemaReferentialAction | null;
    onDelete: InformationSchemaReferentialAction | null;
}

export interface SnapshotConstraintField {
    position: number;
    columnName: string;
    referencedColumnName: string | null;
}