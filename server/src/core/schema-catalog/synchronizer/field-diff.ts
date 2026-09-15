import type { DBColumn, DBTable, StoredField, StoredResource } from "../types/schema-catalog.types";
import type { FieldDiff } from "./synchronizer.types";

export const buildFieldDiff = (snapshot: DBTable[], storedResources: StoredResource[], fields: StoredField[]): FieldDiff => {
    const diff: FieldDiff = {
        added: [],
        changed: [],
        unchanged: [],
        missing: []
    }

    const storedByTableName = new Map<string, StoredResource>();
    for (const storedResource of storedResources) {
        storedByTableName.set(storedResource.tableName, storedResource);
    }

    const storedFieldsByTable = new Map<number, Map<string, StoredField>>();
    for (const field of fields) {
        const resourceId = field.resourceId;
        const fieldName = field.name;
        if (!storedFieldsByTable.has(resourceId)) {
            storedFieldsByTable.set(resourceId, new Map<string, StoredField>());
        }
        storedFieldsByTable.get(resourceId)!.set(fieldName, field);
    }

    for (const snapshotTable of snapshot) {
        const storedResource = storedByTableName.get(snapshotTable.name);
        
        if (!storedResource) {
            for (const column of snapshotTable.columns) {
                diff.added.push({
                    tableName: snapshotTable.name,
                    column
                });
            }
            continue;
        }
        const resourceId = storedResource.id;
        const resourceFields = storedFieldsByTable.get(resourceId);
        
        if (!resourceFields) {
            for (const column of snapshotTable.columns) {
                diff.added.push({
                    tableName: snapshotTable.name,
                    column
                });
            }
            continue;
        }
        
        for (const snapshotColumn of snapshotTable.columns) {
            const storedColumn = resourceFields.get(snapshotColumn.name);
            if (!storedColumn) {
                diff.added.push({
                    tableName: snapshotTable.name,
                    column: snapshotColumn
                });
                continue;
            }

            if (storedResource.state === 'missing' || hasFieldMetadataChanged(snapshotColumn, storedColumn)) {
                diff.changed.push({
                    snapshot: snapshotColumn,
                    stored: storedColumn
                });
                continue;
            }
            else {
                diff.unchanged.push({
                    snapshot: snapshotColumn,
                    stored: storedColumn
                });
            }
            resourceFields.delete(snapshotColumn.name);
        }
    }

    return diff;
}

const hasFieldMetadataChanged = (snapshot: DBColumn, stored: StoredField): boolean => {
    return (
        snapshot.dataType !== stored.dataType
        || snapshot.position !== stored.position
        || snapshot.characterMaximumLength !== stored.characterMaximumLength
        || snapshot.numericPrecision !== stored.numericPrecision
        || snapshot.numericScale !== stored.numericScale
        || snapshot.datetimePrecision !== stored.datetimePrecision
        || snapshot.columnType !== stored.columnType
        || snapshot.nullable !== stored.nullable
        || snapshot.defaultValue !== stored.defaultValue
        || snapshot.autoIncrement !== stored.autoIncrement
        || snapshot.extra !== stored.extra
        || snapshot.characterSetName !== stored.characterSetName
        || snapshot.collationName !== stored.collationName
        || snapshot.comment !== stored.comment
    )
}