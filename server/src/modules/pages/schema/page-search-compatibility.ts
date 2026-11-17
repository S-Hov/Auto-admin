import type { PageSearchField } from "@auto-admin/contracts/pages";
import type { DeepReadonly, StoredField } from "../../../core/schema-catalog";
import { isNumericFieldType, isTextFieldType } from "../../../core/schema-catalog/types/field-type-category";

export function isPageSearchCompatible(search: PageSearchField, field: DeepReadonly<StoredField>): boolean {
    if (isTextFieldType(field.dataType)) {
        switch (search.mode) {
            case 'exact':
            case 'contains':
            case 'startsWith':
                return true;
        }
    }
    if (isNumericFieldType(field.dataType)) {
        switch (search.mode) {
            case 'exact':
                return true;
            case 'contains':
            case 'startsWith':
                return false;
        }
    }

    return false;
}