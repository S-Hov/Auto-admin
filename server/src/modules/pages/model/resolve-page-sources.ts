import type { PageConfig, PageField } from '@auto-admin/contracts/pages';
import type { JoinClause } from '@auto-admin/contracts/query';
import { ERROR_CODES, type ErrorCode } from '@auto-admin/contracts/common';
import type { CachedSchemaCatalog } from '../../../core/schema-catalog';
import { isNumericFieldType, isTextFieldType } from '../../../core/schema-catalog/types/field-type-category';
import { badRequest } from '../../../shared/api/errors/error-helpers';

export function resolvePageSources(config: PageConfig, catalog: CachedSchemaCatalog) {
    const invalid = (field: string, code: ErrorCode): never => {
        throw badRequest(ERROR_CODES.COMMON_VALIDATION_FAILED, { details: [{ field, code }] });
    };
    const resource = (id: number, path: string) => {
        const item = catalog.resources.find(item => item.id === id);
        if (!item || item.state !== 'present' || item.isServiceTable || item.schemaName !== catalog.schemaName) {
            return invalid(path, ERROR_CODES.PAGE_RESOURCE_UNAVAILABLE);
        }
        return item;
    };
    const fields = new Map(catalog.fields.map(field => [field.id, field]));
    function requireField(id: number, resourceId: number, path: string) {
        const field = fields.get(id);
        if (!field || field.state !== 'present') return invalid(path, ERROR_CODES.PAGE_FIELD_UNAVAILABLE);
        if (field.resourceId !== resourceId) return invalid(path, ERROR_CODES.PAGE_FIELD_RESOURCE_MISMATCH);
        return field;
    }

    const primary = resource(config.source.resourceId, 'config.source.resourceId');
    const bindings = new Map([[primary.tableName, primary]]);
    const qualifiers = new Set([primary.tableName.toLowerCase()]);
    const joins = (config.joins ?? []).map((join, index): JoinClause => {
        const path = `config.joins.${index}`;
        const joined = resource(join.resourceId, `${path}.resourceId`);
        const from = join.from ?? primary.tableName;
        const parent = bindings.get(from);
        if (!parent) return invalid(`${path}.from`, ERROR_CODES.VALIDATION_INVALID_VALUE);
        if (qualifiers.has(join.alias.toLowerCase())) return invalid(`${path}.alias`, ERROR_CODES.VALIDATION_INVALID_VALUE);
        const pairs = join.on.map((pair, index) => {
            const pairPath = `${path}.on.${index}`;
            const left = requireField(pair.leftFieldId, parent.id, `${pairPath}.leftFieldId`);
            const right = requireField(pair.rightFieldId, joined.id, `${pairPath}.rightFieldId`);
            const leftType = left.dataType.toLowerCase();
            const rightType = right.dataType.toLowerCase();
            if (leftType !== rightType && !(isNumericFieldType(leftType) && isNumericFieldType(rightType))
                && !(isTextFieldType(leftType) && isTextFieldType(rightType))) {
                return invalid(pairPath, ERROR_CODES.VALIDATION_INVALID_VALUE);
            }
            return [`${from}.${left.name}`, `${join.alias}.${right.name}`] as const;
        });
        bindings.set(join.alias, joined);
        qualifiers.add(join.alias.toLowerCase());
        return { table: `${joined.schemaName}.${joined.tableName}`, alias: join.alias, type: join.type, on: Object.fromEntries(pairs) };
    });

    function resolveColumn(pageField: PageField, path: string) {
        const qualifier = pageField.column?.split('.')[0] ?? primary.tableName;
        const binding = bindings.get(qualifier);
        if (!binding) return invalid(path, ERROR_CODES.PAGE_RESOURCE_UNAVAILABLE);
        const field = requireField(pageField.fieldId, binding.id, path);
        const reference = `${qualifier}.${field.name}`;
        if (pageField.column !== undefined && pageField.column !== reference) {
            return invalid(path, ERROR_CODES.PAGE_FIELD_RESOURCE_MISMATCH);
        }
        return { field, reference };
    }

    return { primary, joins, requireField, resolveColumn };
}
