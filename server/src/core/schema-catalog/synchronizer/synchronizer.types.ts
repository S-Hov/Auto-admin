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