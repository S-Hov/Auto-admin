import type { PoolConnection } from "mysql2/promise";
import { readStoredFields, readStoredResources } from "../repository/catalog-read.repository";
import { markFieldsMissing, upsertPresentFields } from "../repository/field-write.repository";
import type { FieldWriteItem } from "../repository/repository.types";
import { markResourcesMissing, upsertPresentResources } from "../repository/resource-write.repository";
import type { DBSnapshot, SchemaScanChangeCounts } from "../types/schema-catalog.types";
import { buildFieldDiff } from "./field-diff";
import { buildResourceDiff } from "./resource-diff";

export const synchronizeResourcesAndFields = async (connection: PoolConnection, snapshot: DBSnapshot, scanId: number): Promise<SchemaScanChangeCounts> => {
    const oldResources = await readStoredResources(connection, snapshot.schemaName);
    const oldFields = await readStoredFields(connection, snapshot.schemaName);

    const resourceDiff = buildResourceDiff(snapshot.tables, oldResources);
    const fieldDiff = buildFieldDiff(snapshot.tables, oldResources, oldFields);

    await upsertPresentResources(connection, snapshot.schemaName, snapshot.tables, scanId);
    await markResourcesMissing(connection, resourceDiff.missing.map((resource) => resource.id));

    const updatedResources = await readStoredResources(connection, snapshot.schemaName);

    const resourceNameIdMap = new Map<string, number>();
    for (const resource of updatedResources) {
        resourceNameIdMap.set(resource.tableName, resource.id);
    }

    const fieldWriteItems: FieldWriteItem[] = [];

    for (const table of snapshot.tables) {
        const resourceId = resourceNameIdMap.get(table.name);
        if (resourceId === undefined) {
            throw new Error(`Resource ${table.name} not found.`);
        }

        fieldWriteItems.push(...table.columns.map((column) => ({
            resourceId,
            column,
        })));
    }

    await upsertPresentFields(connection, fieldWriteItems, scanId);

    await markFieldsMissing(connection, fieldDiff.missing.map((field) => field.id));

    return {
        addedResources: resourceDiff.added.length,
        changedResources: resourceDiff.changed.length,
        missingResources: resourceDiff.missing.length,
        addedFields: fieldDiff.added.length,
        changedFields: fieldDiff.changed.length,
        missingFields: fieldDiff.missing.length,
    };
}