import type { DbExecutor } from "../../../db";
import { readStoredFields, readStoredResources } from "../repository/catalog-read.repository";
import { markFieldsMissing, upsertPresentFields } from "../repository/field-write.repository";
import { FieldWriteItem } from "../repository/repository.types";
import { markResourcesMissing, upsertPresentResources } from "../repository/resource-write.repository";
import type { DBSnapshot, SchemaScanChangeCounts } from "../types/schema-catalog.types";
import { buildFieldDiff } from "./field-diff";
import { buildResourceDiff } from "./resource-diff";

export const synchronizeResourcesAndFields = async (executor: DbExecutor, snapshot: DBSnapshot, scanId: number): Promise<SchemaScanChangeCounts> => {
    const oldResources = await readStoredResources(executor, snapshot.schemaName);
    const oldFields = await readStoredFields(executor, snapshot.schemaName);

    const resourceDiff = buildResourceDiff(snapshot.tables, oldResources);
    const fieldDiff = buildFieldDiff(snapshot.tables, oldResources, oldFields);

    await upsertPresentResources(executor, snapshot.schemaName, resourceDiff.added, scanId);
    await upsertPresentResources(executor, snapshot.schemaName, resourceDiff.changed.map((pair) => ({ ...pair.snapshot, id: pair.stored.id })), scanId);
    await markResourcesMissing(executor, resourceDiff.missing.map((resource) => resource.id));

    const updatedResources = await readStoredResources(executor, snapshot.schemaName);

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

    await upsertPresentFields(executor, fieldWriteItems, scanId);

    await markFieldsMissing(executor, fieldDiff.missing.map((field) => field.id));

    return {
        addedResources: resourceDiff.added.length,
        changedResources: resourceDiff.changed.length,
        missingResources: resourceDiff.missing.length,
        addedFields: fieldDiff.added.length,
        changedFields: fieldDiff.changed.length,
        missingFields: fieldDiff.missing.length,
    };
}