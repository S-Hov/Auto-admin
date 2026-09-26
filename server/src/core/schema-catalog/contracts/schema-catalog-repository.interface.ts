import type {
    DBTable,
    SchemaCatalog,
    SchemaScanChangeCounts,
    StoredConstraint,
    StoredField,
    StoredIndex,
    StoredResource,
} from "../types/schema-catalog.types";
import type {
    ConstraintFieldWriteItem,
    ConstraintWriteItem,
    FieldWriteItem,
    IndexPartWriteItem,
    IndexWriteItem,
} from "./schema-catalog-repository.types";

export interface SchemaCatalogRepository {
    readPersistedCatalog(
        schemaName: string,
        knownFingerprint?: string,
    ): Promise<SchemaCatalog | null>;

    readStoredResources(schemaName: string): Promise<StoredResource[]>;

    readStoredFields(schemaName: string): Promise<StoredField[]>;

    readStoredConstraints(schemaName: string): Promise<StoredConstraint[]>;

    readStoredIndexes(schemaName: string): Promise<StoredIndex[]>;

    createRunningScan(
        schemaName: string,
        createdBy: number | null,
    ): Promise<number>;

    markScanSucceeded(
        scanId: number,
        fingerprint: string,
        counts: SchemaScanChangeCounts,
    ): Promise<void>;

    markScanFailed(scanId: number, errorCode: string): Promise<void>;

    upsertPresentResources(
        schemaName: string,
        snapshotTables: DBTable[],
        scanId: number,
    ): Promise<void>;

    markResourcesMissing(resourceIds: number[]): Promise<void>;

    upsertPresentFields(items: FieldWriteItem[], scanId: number): Promise<void>;

    markFieldsMissing(fieldIds: number[]): Promise<void>;

    upsertPresentConstraints(
        items: ConstraintWriteItem[],
        scanId: number,
    ): Promise<void>;

    markConstraintsMissing(ids: number[]): Promise<void>;

    replaceConstraintFields(
        constraintIds: number[],
        items: ConstraintFieldWriteItem[],
    ): Promise<void>;

    upsertPresentIndexes(
        items: IndexWriteItem[],
        scanId: number,
    ): Promise<void>;

    markIndexesMissing(ids: number[]): Promise<void>;

    replaceIndexParts(
        indexIds: number[],
        items: IndexPartWriteItem[],
    ): Promise<void>;
}
