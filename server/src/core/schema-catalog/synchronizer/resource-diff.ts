import type { DBTable, StoredResource } from "../types/schema-catalog.types";
import type { ResourceDiff } from "./synchronizer.types";

export const buildResourceDiff = (snapshotTables: DBTable[], storedResources: StoredResource[]): ResourceDiff => {
    const diff: ResourceDiff = {
        added: [],
        changed: [],
        unchanged: [],
        missing: [],
    };

    const storedByTableName = new Map<string, StoredResource>();
    for (const storedResource of storedResources) {
        storedByTableName.set(
            storedResource.tableName,
            storedResource,
        );
    }

    for (const snapshotTable of snapshotTables) {
        const storedResource = storedByTableName.get(snapshotTable.name);

        if (!storedResource) {
            diff.added.push(snapshotTable);
            continue;
        }

        const pair = {
            snapshot: snapshotTable,
            stored: storedResource,
        };

        if (
            storedResource.state === 'missing'
            || hasResourceMetadataChanged(snapshotTable, storedResource)
        ) {
            diff.changed.push(pair);
        } else {
            diff.unchanged.push(pair);
        }

        storedByTableName.delete(snapshotTable.name);
    }

    for (const storedResource of storedByTableName.values()) {
        if (storedResource.state === 'present') {
            diff.missing.push(storedResource);
        }
    }

    return diff;
};

const hasResourceMetadataChanged = (
    snapshot: DBTable,
    stored: StoredResource,
): boolean => {
    return (
        snapshot.type !== stored.type
        || snapshot.engine !== stored.engine
        || snapshot.comment !== stored.comment
        || snapshot.isServiceTable !== stored.isServiceTable
    );
};