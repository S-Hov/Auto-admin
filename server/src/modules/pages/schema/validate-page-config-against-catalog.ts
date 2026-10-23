import type { CachedSchemaCatalog, StoredField } from "../../../core/schema-catalog";
import { badRequest } from "../../../shared/api/errors/error-helpers";
import type { PageConfig } from "./page-config.schema";

export const validatePageConfigAgainstCatalog = (
    config: PageConfig,
    catalog: CachedSchemaCatalog,
) => {
    const tableId = config.source.resourceId;
    const table = catalog.resources.find((item) => item.id === tableId);
    if (
        !table
        || table.isServiceTable
        || table.state !== "present"
    ) throw badRequest();

    const fields = new Map<number, StoredField>();

    for (const cField of config.fields) {
        const filed = catalog.fields.find((item) => item.id === cField.fieldId);
        if (!filed || filed.resourceId !== table.id || filed.state !== "present") throw badRequest();
        fields.set(Number(cField.id), filed);
    }

    if (config.source.recordKey) {
        for (const key of config.source.recordKey) {
            const filed = fields.get(key)
            if (!filed) throw badRequest();
            const index = catalog.indexes.find((i) => i.resourceId === tableId);
        }
    }

};
