import type { SnapshotConstraint } from "./synchronizer.types";
import type { PoolConnection } from "mysql2/promise";
import type {
    DBSnapshot,
    SchemaScanChangeCounts,
    StoredField,
    StoredResource,
} from "../types/schema-catalog.types";
import type {
    ConstraintFieldWriteItem,
    ConstraintWriteItem,
    FieldWriteItem,
    IndexPartWriteItem,
    IndexWriteItem,
} from "../contracts/schema-catalog-repository.types";
import { readStoredConstraints } from "../repository/constraint-read.repository";
import {
    markConstraintsMissing,
    replaceConstraintFields,
    upsertPresentConstraints,
} from "../repository/constraint-write.repository";
import {
    readStoredFields,
    readStoredResources,
} from "../repository/catalog-read.repository";
import { readStoredIndexes } from "../repository/index-read.repository";
import {
    markIndexesMissing,
    replaceIndexParts,
    upsertPresentIndexes,
} from "../repository/index-write.repository";
import {
    markResourcesMissing,
    upsertPresentResources,
} from "../repository/resource-write.repository";
import { flattenSnapshotConstraints } from "./constraint-flattener";
import { buildFieldDiff } from "./field-diff";
import { buildResourceDiff } from "./resource-diff";
import {
    markFieldsMissing,
    upsertPresentFields,
} from "../repository/field-write.repository";

const identityKey = (parentId: number, name: string): string =>
    `${parentId}\u0000${name}`;

const buildPresentResourceMap = (
    resources: StoredResource[],
): Map<string, StoredResource> => {
    return new Map(
        resources
            .filter((resource) => resource.state === "present")
            .map((resource) => [resource.tableName, resource]),
    );
};

const buildPresentFieldMap = (
    fields: StoredField[],
): Map<number, Map<string, StoredField>> => {
    const fieldsByResourceId = new Map<number, Map<string, StoredField>>();

    for (const field of fields) {
        if (field.state !== "present") continue;
        const resourceFields =
            fieldsByResourceId.get(field.resourceId) ??
            new Map<string, StoredField>();
        resourceFields.set(field.name, field);
        fieldsByResourceId.set(field.resourceId, resourceFields);
    }

    return fieldsByResourceId;
};

const requireResource = (
    resources: Map<string, StoredResource>,
    tableName: string,
): StoredResource => {
    const resource = resources.get(tableName);
    if (!resource) throw new Error(`Resource ${tableName} was not saved`);
    return resource;
};

const requireField = (
    fields: Map<number, Map<string, StoredField>>,
    resourceId: number,
    columnName: string,
): StoredField => {
    const field = fields.get(resourceId)?.get(columnName);
    if (!field)
        throw new Error(`Field ${resourceId}.${columnName} was not saved`);
    return field;
};

const synchronizeConstraints = async (
    connection: PoolConnection,
    snapshot: DBSnapshot,
    scanId: number,
    resources: Map<string, StoredResource>,
    fields: Map<number, Map<string, StoredField>>,
): Promise<void> => {
    const oldConstraints = await readStoredConstraints(
        connection,
        snapshot.schemaName,
    );
    const snapshotConstraints = flattenSnapshotConstraints(snapshot.tables);
    const writeItems: ConstraintWriteItem[] = snapshotConstraints.map(
        (constraint) => {
            const resource = requireResource(resources, constraint.tableName);
            const referencedResource =
                constraint.referencedSchemaName === snapshot.schemaName &&
                constraint.referencedTableName !== null
                    ? resources.get(constraint.referencedTableName)
                    : undefined;

            return {
                resourceId: resource.id,
                constraintName: constraint.constraintName,
                type: constraint.type,
                referencedSchemaName: constraint.referencedSchemaName,
                referencedTableName: constraint.referencedTableName,
                referencedResourceId: referencedResource?.id ?? null,
                onUpdate: constraint.onUpdate,
                onDelete: constraint.onDelete,
            };
        },
    );

    const presentKeys = new Set(
        writeItems.map((item) =>
            identityKey(item.resourceId, item.constraintName),
        ),
    );
    await upsertPresentConstraints(connection, writeItems, scanId);
    await markConstraintsMissing(
        connection,
        oldConstraints
            .filter(
                (constraint) =>
                    constraint.state === "present" &&
                    !presentKeys.has(
                        identityKey(
                            constraint.resourceId,
                            constraint.constraintName,
                        ),
                    ),
            )
            .map((constraint) => constraint.id),
    );

    const storedConstraints = await readStoredConstraints(
        connection,
        snapshot.schemaName,
    );
    const storedByKey = new Map(
        storedConstraints
            .filter((constraint) => constraint.state === "present")
            .map((constraint) => [
                identityKey(constraint.resourceId, constraint.constraintName),
                constraint,
            ]),
    );
    const constraintFieldItems: ConstraintFieldWriteItem[] = [];
    const currentConstraintIds: number[] = [];

    for (const constraint of snapshotConstraints) {
        const resource = requireResource(resources, constraint.tableName);
        const stored = storedByKey.get(
            identityKey(resource.id, constraint.constraintName),
        );
        if (!stored)
            throw new Error(
                `Constraint ${constraint.tableName}.${constraint.constraintName} was not saved`,
            );
        currentConstraintIds.push(stored.id);

        for (const field of constraint.fields) {
            const localField = requireField(
                fields,
                resource.id,
                field.columnName,
            );
            const referencedField = resolveReferencedField(
                snapshot,
                constraint,
                field.referencedColumnName,
                resources,
                fields,
            );
            constraintFieldItems.push({
                constraintId: stored.id,
                position: field.position,
                fieldId: localField.id,
                referencedFieldId: referencedField?.id ?? null,
                referencedColumnName: field.referencedColumnName,
            });
        }
    }

    await replaceConstraintFields(
        connection,
        currentConstraintIds,
        constraintFieldItems,
    );
};

const resolveReferencedField = (
    snapshot: DBSnapshot,
    constraint: SnapshotConstraint,
    referencedColumnName: string | null,
    resources: Map<string, StoredResource>,
    fields: Map<number, Map<string, StoredField>>,
): StoredField | null => {
    if (
        referencedColumnName === null ||
        constraint.referencedSchemaName !== snapshot.schemaName ||
        constraint.referencedTableName === null
    )
        return null;

    const resource = requireResource(resources, constraint.referencedTableName);
    return requireField(fields, resource.id, referencedColumnName);
};

const synchronizeIndexes = async (
    connection: PoolConnection,
    snapshot: DBSnapshot,
    scanId: number,
    resources: Map<string, StoredResource>,
    fields: Map<number, Map<string, StoredField>>,
): Promise<void> => {
    const oldIndexes = await readStoredIndexes(connection, snapshot.schemaName);
    const writeItems: IndexWriteItem[] = snapshot.tables.flatMap((table) => {
        const resource = requireResource(resources, table.name);
        return table.indexes.map((index) => ({
            resourceId: resource.id,
            index,
        }));
    });
    const presentKeys = new Set(
        writeItems.map((item) => identityKey(item.resourceId, item.index.name)),
    );

    await upsertPresentIndexes(connection, writeItems, scanId);
    await markIndexesMissing(
        connection,
        oldIndexes
            .filter(
                (index) =>
                    index.state === "present" &&
                    !presentKeys.has(identityKey(index.resourceId, index.name)),
            )
            .map((index) => index.id),
    );

    const storedIndexes = await readStoredIndexes(
        connection,
        snapshot.schemaName,
    );
    const storedByKey = new Map(
        storedIndexes
            .filter((index) => index.state === "present")
            .map((index) => [identityKey(index.resourceId, index.name), index]),
    );
    const partItems: IndexPartWriteItem[] = [];
    const currentIndexIds: number[] = [];

    for (const table of snapshot.tables) {
        const resource = requireResource(resources, table.name);
        for (const index of table.indexes) {
            const stored = storedByKey.get(
                identityKey(resource.id, index.name),
            );
            if (!stored)
                throw new Error(
                    `Index ${table.name}.${index.name} was not saved`,
                );
            currentIndexIds.push(stored.id);

            for (const part of index.parts) {
                partItems.push({
                    indexId: stored.id,
                    position: part.position,
                    fieldId:
                        part.kind === "column"
                            ? requireField(fields, resource.id, part.columnName)
                                  .id
                            : null,
                    expression: part.expression,
                    prefixLength: part.prefixLength,
                    sortDirection: part.sortDirection,
                });
            }
        }
    }

    await replaceIndexParts(connection, currentIndexIds, partItems);
};

export const synchronizeSchemaCatalog = async (
    connection: PoolConnection,
    snapshot: DBSnapshot,
    scanId: number,
): Promise<SchemaScanChangeCounts> => {
    const oldResources = await readStoredResources(
        connection,
        snapshot.schemaName,
    );
    const oldFields = await readStoredFields(connection, snapshot.schemaName);
    const resourceDiff = buildResourceDiff(snapshot.tables, oldResources);
    const fieldDiff = buildFieldDiff(snapshot.tables, oldResources, oldFields);

    await upsertPresentResources(
        connection,
        snapshot.schemaName,
        snapshot.tables,
        scanId,
    );
    await markResourcesMissing(
        connection,
        resourceDiff.missing.map((resource) => resource.id),
    );

    const resourcesAfterUpsert = await readStoredResources(
        connection,
        snapshot.schemaName,
    );
    const resources = buildPresentResourceMap(resourcesAfterUpsert);
    const fieldWriteItems: FieldWriteItem[] = snapshot.tables.flatMap(
        (table) => {
            const resource = requireResource(resources, table.name);
            return table.columns.map((column) => ({
                resourceId: resource.id,
                column,
            }));
        },
    );

    await upsertPresentFields(connection, fieldWriteItems, scanId);
    await markFieldsMissing(
        connection,
        fieldDiff.missing.map((field) => field.id),
    );

    const fieldsAfterUpsert = await readStoredFields(
        connection,
        snapshot.schemaName,
    );
    const fields = buildPresentFieldMap(fieldsAfterUpsert);
    await synchronizeConstraints(
        connection,
        snapshot,
        scanId,
        resources,
        fields,
    );
    await synchronizeIndexes(connection, snapshot, scanId, resources, fields);

    return {
        addedResources: resourceDiff.added.length,
        changedResources: resourceDiff.changed.length,
        missingResources: resourceDiff.missing.length,
        addedFields: fieldDiff.added.length,
        changedFields: fieldDiff.changed.length,
        missingFields: fieldDiff.missing.length,
    };
};
