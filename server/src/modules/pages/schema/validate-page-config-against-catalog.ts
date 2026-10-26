import type { CachedSchemaCatalog } from "../../../core/schema-catalog";
import { badRequest } from "../../../shared/api/errors/error-helpers";
import type { PageConfig } from "./page-config.schema";

export const validatePageConfigAgainstCatalog = (
    config: PageConfig,
    catalog: CachedSchemaCatalog,
): void => {
    const tableId = config.source.resourceId;
    const table = catalog.resources.find((item) => item.id === tableId);
    if (
        !table ||
        table.schemaName !== catalog.schemaName ||
        table.isServiceTable ||
        table.state !== "present"
    ) {
        throw badRequest();
    }

    const fields = new Map(catalog.fields.map((field) => [field.id, field]));
    const requireField = (fieldId: number) => {
        const field = fields.get(fieldId);
        if (!field || field.resourceId !== tableId || field.state !== "present") {
            throw badRequest();
        }
        return field;
    };

    for (const pageField of config.fields) {
        requireField(pageField.fieldId);
    }

    const recordKey = config.source.recordKey;
    if (recordKey === null) return;

    for (const fieldId of recordKey) {
        if (requireField(fieldId).nullable) {
            throw badRequest();
        }
    }

    const keyIds = new Set(recordKey);
    const hasUniqueKey = catalog.indexes.some((index) => {
        if (
            index.resourceId !== tableId ||
            index.state !== "present" ||
            !index.isUnique ||
            index.parts.length !== recordKey.length
        ) {
            return false;
        }

        const indexFieldIds = new Set<number>();
        for (const part of index.parts) {
            if (part.kind !== "column" || part.prefixLength !== null || !keyIds.has(part.fieldId)) {
                return false;
            }
            indexFieldIds.add(part.fieldId);
        }

        return keyIds.size > 0 && indexFieldIds.size === keyIds.size;
    });

    if (!hasUniqueKey) throw badRequest();
};
