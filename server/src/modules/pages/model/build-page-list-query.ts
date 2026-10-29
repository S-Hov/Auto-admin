import type { PageConfig } from "@auto-admin/contracts/pages";
import type { ReadQuery } from "../../../core/query-engine";
import type { CachedSchemaCatalog } from "../../../core/schema-catalog";
import { ERROR_CODES, type ErrorCode } from '../../../shared/api/codes/error-codes';
import { badRequest } from '../../../shared/api/errors/error-helpers';
import { mapZodIssue } from '../../../shared/api/validation/map-zod-issue';
import { pageRowsQuerySchema } from '../schema/page-rows-query.schema';
import type { PageRowsQuery } from "../schema/page-rows-query.schema";
import { validatePageConfigAgainstCatalog } from "../schema/validate-page-config-against-catalog";

export const buildPageListQuery = (config: PageConfig, catalog: CachedSchemaCatalog, params: PageRowsQuery): ReadQuery & { limit: number; offset: number } => {
    validatePageConfigAgainstCatalog(config, catalog);

    const fail = (field: string, code: ErrorCode = ERROR_CODES.VALIDATION_INVALID_VALUE): never => {
        throw badRequest(ERROR_CODES.COMMON_VALIDATION_FAILED, { details: [{ field, code }] });
    };
    const parsed = pageRowsQuerySchema.safeParse(params);
    if (!parsed.success) {
        throw badRequest(ERROR_CODES.COMMON_VALIDATION_FAILED, {
            details: parsed.error.issues.map((issue) => mapZodIssue(issue, params)),
        });
    }
    const options = parsed.data;
    const resource = catalog.resources.find((res) => res.id === config.source.resourceId);
    if (!resource) return fail('config.source.resourceId', ERROR_CODES.PAGE_RESOURCE_UNAVAILABLE);

    const catalogFields = new Map(catalog.fields.map((field) => [field.id, field]));
    const pageFields = new Map(config.fields.map((field) => [field.id, field]));
    const columnName = (fieldId: number, path: string): string => {
        const field = catalogFields.get(fieldId);
        if (!field || field.state !== 'present') return fail(path, ERROR_CODES.PAGE_FIELD_UNAVAILABLE);
        if (field.resourceId !== resource.id) return fail(path, ERROR_CODES.PAGE_FIELD_RESOURCE_MISMATCH);
        return field.name;
    };
    const pageColumnName = (id: string, path: string): string => {
        const field = pageFields.get(id);
        if (!field) return fail(path, ERROR_CODES.PAGE_FIELD_UNAVAILABLE);
        return columnName(field.fieldId, path);
    };

    const select = [...new Set(config.list.columns.map((id, index) =>
        pageColumnName(id, `config.list.columns.${index}`)))];
    if (select.length === 0) return fail('config.list.columns');

    const requestedSort = options.sort;
    if (requestedSort && !config.list.sorting.allowed.includes(requestedSort.field)) {
        return fail('sort.field');
    }
    const sourceSort = requestedSort ? [requestedSort] : config.list.sorting.default;
    const sort: NonNullable<ReadQuery['sort']> = [];
    const sortedNames = new Set<string>();
    sourceSort.forEach((item, index) => {
        const path = requestedSort ? 'sort.field' : `config.list.sorting.default.${index}.field`;
        if (!config.list.sorting.allowed.includes(item.field)) fail(path);
        const name = pageColumnName(item.field, path);
        if (!sortedNames.has(name)) {
            sort.push({ field: name, direction: item.direction });
            sortedNames.add(name);
        }
    });

    config.source.recordKey?.forEach((fieldId, index) => {
        const name = columnName(fieldId, `config.source.recordKey.${index}`);
        if (!sortedNames.has(name)) {
            sort.push({ field: name, direction: 'asc' });
            sortedNames.add(name);
        }
    });

    const limit = options.limit ?? config.list.pagination.defaultPageSize;
    if (!config.list.pagination.pageSizeOptions.includes(limit)) return fail('limit');

    return {
        action: 'read',
        table: `${resource.schemaName}.${resource.tableName}`,
        select,
        ...(sort.length > 0 ? { sort } : {}),
        limit,
        offset: options.offset,
    };
}
