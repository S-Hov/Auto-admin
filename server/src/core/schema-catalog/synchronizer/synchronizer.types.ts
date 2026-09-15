import type { DBTable, StoredResource } from '../types/schema-catalog.types';

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
