import { ERROR_CODES, type ErrorCode } from "@auto-admin/contracts/common";
import type { PageConfig, PageSearchField } from "@auto-admin/contracts/pages";
import type { FieldCondition, WhereClause } from "@auto-admin/contracts/query";
import type { CachedSchemaCatalog } from "../../../core/schema-catalog";
import { isTextFieldType } from "../../../core/schema-catalog/types/field-type-category";
import { badRequest } from "../../../shared/api/errors/error-helpers";
import { isPageSearchCompatible } from "../schema/page-search-compatibility";

type PageSearchCondition =
    | { kind: "where"; where: WhereClause }
    | { kind: "no-match" };

const textOperators = {
    exact: "_eq",
    contains: "_contains",
    startsWith: "_starts_with",
} as const satisfies Record<PageSearchField["mode"], keyof FieldCondition>;

function invalidSearch(
    field: string,
    code: ErrorCode = ERROR_CODES.VALIDATION_INVALID_VALUE,
): never {
    throw badRequest(ERROR_CODES.COMMON_VALIDATION_FAILED, {
        details: [{ field, code }],
    });
}

/** Builds text conditions from normalized input. Numeric exact is added before wiring this into rows. */
export function buildPageSearchCondition(
    config: Pick<PageConfig, "source" | "search">,
    catalog: CachedSchemaCatalog,
    searchText?: string,
): PageSearchCondition | undefined {
    if (!searchText) return undefined;
    if (!config.search) return invalidSearch("search");

    const resource = catalog.resources.find(
        (item) => item.id === config.source.resourceId,
    );
    if (
        !resource ||
        resource.state !== "present" ||
        resource.isServiceTable ||
        resource.schemaName !== catalog.schemaName
    ) {
        return invalidSearch(
            "config.source.resourceId",
            ERROR_CODES.PAGE_RESOURCE_UNAVAILABLE,
        );
    }

    const catalogFields = new Map(
        catalog.fields.map((field) => [field.id, field]),
    );
    const conditions: WhereClause[] = [];
    for (const [index, searchField] of config.search.fields.entries()) {
        const path = `config.search.fields.${index}`;
        const catalogField = catalogFields.get(searchField.fieldId);
        if (!catalogField || catalogField.state !== "present") {
            return invalidSearch(
                `${path}.fieldId`,
                ERROR_CODES.PAGE_FIELD_UNAVAILABLE,
            );
        }
        if (catalogField.resourceId !== resource.id) {
            return invalidSearch(
                `${path}.fieldId`,
                ERROR_CODES.PAGE_FIELD_RESOURCE_MISMATCH,
            );
        }
        if (!isPageSearchCompatible(searchField, catalogField)) {
            return invalidSearch(
                `${path}.mode`,
                ERROR_CODES.PAGE_SEARCH_INCOMPATIBLE,
            );
        }
        if (!isTextFieldType(catalogField.dataType)) continue;

        const reference = `${resource.tableName}.${catalogField.name}`;
        conditions.push({
            [reference]: { [textOperators[searchField.mode]]: searchText },
        });
    }

    return conditions.length === 0
        ? { kind: "no-match" }
        : { kind: "where", where: { _or: conditions } };
}
