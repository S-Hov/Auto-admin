import type { CachedSchemaCatalog } from "../../../core/schema-catalog";
import { badRequest } from "../../../shared/api/errors/error-helpers";
import { ERROR_CODES, type ErrorCode, type FieldValidationError } from "@auto-admin/contracts/common";
import { isPageDisplayCompatible } from './page-display-compatibility';
import type { PageConfig } from "@auto-admin/contracts/pages";
import { isPageSearchCompatible } from "./page-search-compatibility";
import { resolvePageSources } from '../model/resolve-page-sources';

const invalidConfig = (field: string, code: ErrorCode): never => {
    const details: FieldValidationError[] = [{ field, code }];
    throw badRequest(ERROR_CODES.COMMON_VALIDATION_FAILED, { details });
};

export const validatePageConfigAgainstCatalog = (
    config: PageConfig,
    catalog: CachedSchemaCatalog,
): void => {
    const tableId = config.source.resourceId;
    const sources = resolvePageSources(config, catalog);
    const requireField = (fieldId: number, path: string) => sources.requireField(fieldId, tableId, path);

    config.fields.forEach((pageField, index) => {
        const { field } = sources.resolveColumn(pageField, `config.fields.${index}.fieldId`);
        if (!isPageDisplayCompatible(pageField.display, field)) {
            invalidConfig(`config.fields.${index}.display.type`, ERROR_CODES.PAGE_DISPLAY_INCOMPATIBLE);
        }
    });

    config.search?.fields.forEach((searchField, index) => {
        const field = requireField(searchField.fieldId, `config.search.fields.${index}.fieldId`);
        if (!isPageSearchCompatible(searchField, field)) {
            invalidConfig(`config.search.fields.${index}.mode`, ERROR_CODES.PAGE_SEARCH_INCOMPATIBLE);
        }
    });

    const recordKey = config.source.recordKey;
    if (recordKey === null) return;

    for (const [position, fieldId] of recordKey.entries()) {
        const path = `config.source.recordKey.${position}`;
        if (requireField(fieldId, path).nullable) {
            invalidConfig(path, ERROR_CODES.PAGE_RECORD_KEY_NULLABLE);
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

    if (!hasUniqueKey) invalidConfig('config.source.recordKey', ERROR_CODES.PAGE_RECORD_KEY_INVALID);
};
