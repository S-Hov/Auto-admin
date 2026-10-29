import type { PageConfig } from '@auto-admin/contracts/pages';
import type { CachedSchemaCatalog } from '../../../core/schema-catalog';
import { ERROR_CODES } from '../../../shared/api/codes/error-codes';
import { badRequest } from '../../../shared/api/errors/error-helpers';

export function mapPageListRows(
    config: PageConfig,
    catalog: CachedSchemaCatalog,
    rows: readonly Readonly<Record<string, unknown>>[],
): Record<string, unknown>[] {
    const pageFields = new Map(config.fields.map((field) => [field.id, field]));
    const catalogFields = new Map(catalog.fields.map((field) => [field.id, field]));
    const mappings = config.list.columns.map((id, index) => {
        const pageField = pageFields.get(id);
        const field = pageField ? catalogFields.get(pageField.fieldId) : undefined;
        if (!field || field.state !== 'present' || field.resourceId !== config.source.resourceId) {
            throw badRequest(ERROR_CODES.COMMON_VALIDATION_FAILED, {
                details: [{ field: `config.list.columns.${index}`, code: ERROR_CODES.PAGE_FIELD_UNAVAILABLE }],
            });
        }
        return { id, columnName: field.name };
    });

    return rows.map((row, index) => Object.fromEntries(mappings.map(({ id, columnName }) => {
        if (!Object.prototype.hasOwnProperty.call(row, columnName) || row[columnName] === undefined) {
            throw new Error(`Page list result is missing an expected column (row ${index})`);
        }
        return [id, row[columnName]];
    })));
}
