import { pageRowsQuerySchema, type PageConfig, type PageRowsQuery } from "@auto-admin/contracts/pages";
import type { ReadQuery } from "../../../core/query-engine";
import type { CachedSchemaCatalog } from "../../../core/schema-catalog";
import { ERROR_CODES, type ErrorCode } from "@auto-admin/contracts/common";
import { badRequest } from '../../../shared/api/errors/error-helpers';
import { mapZodIssue } from '../../../shared/api/validation/map-zod-issue';
import { validatePageConfigAgainstCatalog } from "../schema/validate-page-config-against-catalog";
import { resolvePageSources } from './resolve-page-sources';

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
    const { primary: resource, joins, resolveColumn } = resolvePageSources(config, catalog);
    const qualified = joins.length > 0;

    const catalogFields = new Map(catalog.fields.map((field) => [field.id, field]));
    const pageFields = new Map(config.fields.map((field) => [field.id, field]));
    const columnName = (fieldId: number, path: string): string => {
        const field = catalogFields.get(fieldId);
        if (!field || field.state !== 'present') return fail(path, ERROR_CODES.PAGE_FIELD_UNAVAILABLE);
        if (field.resourceId !== resource.id) return fail(path, ERROR_CODES.PAGE_FIELD_RESOURCE_MISMATCH);
        return qualified ? `${resource.tableName}.${field.name}` : field.name;
    };
    const pageColumnName = (id: string, path: string): string => {
        const field = pageFields.get(id);
        if (!field) return fail(path, ERROR_CODES.PAGE_FIELD_UNAVAILABLE);
        return qualified ? resolveColumn(field, path).reference : columnName(field.fieldId, path);
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

    // One primary row can now match multiple joined rows. Use a unique key
    // from each joined table as a tie-breaker when it fits the query budget.
    for (const join of config.joins ?? []) {
        const keys = catalog.indexes.filter(index => index.resourceId === join.resourceId && index.state === 'present' && index.isUnique)
            .sort((a, b) => Number(b.name === 'PRIMARY') - Number(a.name === 'PRIMARY') || a.parts.length - b.parts.length || a.id - b.id);
        for (const key of keys) {
            const names = key.parts.map(part => {
                if (part.kind !== 'column' || part.prefixLength !== null) return null;
                const field = catalogFields.get(part.fieldId);
                return field && field.state === 'present' && !field.nullable && field.resourceId === join.resourceId
                    ? `${join.alias}.${field.name}` : null;
            });
            if (!names.length || names.some(name => name === null)) continue;
            const extra = names.filter((name): name is string => name !== null && !sortedNames.has(name));
            if (sort.length + extra.length > 10) continue;
            for (const name of extra) {
                sort.push({ field: name, direction: 'asc' });
                sortedNames.add(name);
            }
            break;
        }
    }

    const limit = options.limit ?? config.list.pagination.defaultPageSize;
    if (!config.list.pagination.pageSizeOptions.includes(limit)) return fail('limit');

    return {
        action: 'read',
        table: `${resource.schemaName}.${resource.tableName}`,
        select,
        ...(qualified ? { joins, qualifiedOutput: true as const } : {}),
        ...(sort.length > 0 ? { sort } : {}),
        limit,
        offset: options.offset,
    };
}
