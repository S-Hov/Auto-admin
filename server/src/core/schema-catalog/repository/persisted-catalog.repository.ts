import type { DatabaseExecutor } from "../../../db/contracts/executor.interface";
import type { SchemaCatalog } from "../types/schema-catalog.types";
import { readStoredFields, readStoredResources } from "./catalog-read.repository";
import { readStoredConstraints } from "./constraint-read.repository";
import { readStoredIndexes } from "./index-read.repository";
import { readLatestSuccessfulScanFingerprint } from "./schema-scan.repository";

export const readPersistedSchemaCatalog = async (
    executor: DatabaseExecutor,
    schemaName: string,
    knownFingerprint?: string,
): Promise<SchemaCatalog | null> => {
    const fingerprint = knownFingerprint
        ?? await readLatestSuccessfulScanFingerprint(executor, schemaName);
    if (!fingerprint) return null;

    const resources = (await readStoredResources(executor, schemaName))
        .filter((resource) => resource.state === 'present');
    const resourceIds = new Set(resources.map((resource) => resource.id));

    const fields = (await readStoredFields(executor, schemaName))
        .filter((field) => field.state === 'present' && resourceIds.has(field.resourceId));
    const fieldIds = new Set(fields.map((field) => field.id));

    const constraints = (await readStoredConstraints(executor, schemaName))
        .filter((constraint) => constraint.state === 'present' && resourceIds.has(constraint.resourceId))
        .map((constraint) => ({
            ...constraint,
            fields: constraint.fields.filter((field) => fieldIds.has(field.fieldId)),
        }));

    const indexes = (await readStoredIndexes(executor, schemaName))
        .filter((index) => index.state === 'present' && resourceIds.has(index.resourceId))
        .map((index) => ({
            ...index,
            parts: index.parts.filter((part) => part.fieldId === null || fieldIds.has(part.fieldId)),
        }));

    return {
        schemaName,
        fingerprint,
        loadedAt: Date.now(),
        resources,
        fields,
        constraints,
        indexes,
    };
};
