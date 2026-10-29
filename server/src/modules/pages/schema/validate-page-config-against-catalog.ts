import type { CachedSchemaCatalog } from "../../../core/schema-catalog";
import { badRequest } from "../../../shared/api/errors/error-helpers";
import { ERROR_CODES, type ErrorCode } from '../../../shared/api/codes/error-codes';
import type { FieldValidationError } from '../../../shared/api/validation/validation.types';
import { isPageDisplayCompatible } from './page-display-compatibility';
import type { PageConfig } from "@auto-admin/contracts/pages";

const invalidConfig = (field: string, code: ErrorCode): never => {
    const details: FieldValidationError[] = [{ field, code }];
    throw badRequest(ERROR_CODES.COMMON_VALIDATION_FAILED, { details });
};

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
        invalidConfig('config.source.resourceId', ERROR_CODES.PAGE_RESOURCE_UNAVAILABLE);
    }

    const fields = new Map(catalog.fields.map((field) => [field.id, field]));
    const requireField = (fieldId: number, path: string) => {
        const field = fields.get(fieldId);
        if (!field || field.state !== "present") return invalidConfig(path, ERROR_CODES.PAGE_FIELD_UNAVAILABLE);
        if (field.resourceId !== tableId) return invalidConfig(path, ERROR_CODES.PAGE_FIELD_RESOURCE_MISMATCH);
        return field;
    };

    config.fields.forEach((pageField, index) => {
        const field = requireField(pageField.fieldId, `config.fields.${index}.fieldId`);
        if (!isPageDisplayCompatible(pageField.display, field)) {
            invalidConfig(`config.fields.${index}.display.type`, ERROR_CODES.PAGE_DISPLAY_INCOMPATIBLE);
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
