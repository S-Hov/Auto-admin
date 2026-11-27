import { catalogDisplayTypeSchema, type CatalogResource } from '@auto-admin/contracts/schema-catalog';
import type { CachedSchemaCatalog } from '../../core/schema-catalog';
import { isPageDisplayCompatible } from '../pages/schema/page-display-compatibility';

/** Public metadata only: no defaults, generated expressions or scan bookkeeping. */
export function presentCatalog(catalog: CachedSchemaCatalog): { fingerprint: string; resources: CatalogResource[] } {
    return {
        fingerprint: catalog.fingerprint,
        resources: catalog.resources.filter(resource => resource.state === 'present' && resource.schemaName === catalog.schemaName)
            .map(resource => {
                const fields = catalog.fields.filter(field => field.resourceId === resource.id && field.state === 'present')
                    .sort((a, b) => a.position - b.position);
                const byId = new Map(fields.map(field => [field.id, field]));
                const recordKeys = catalog.indexes.filter(index => index.resourceId === resource.id && index.state === 'present' && index.isUnique)
                    .filter(index => index.parts.length > 0 && index.parts.length <= 16 && new Set(index.parts.map(part => part.fieldId)).size === index.parts.length && index.parts.every(part => part.kind === 'column' && part.prefixLength === null && byId.get(part.fieldId)?.nullable === false))
                    .sort((a, b) => Number(b.name === 'PRIMARY') - Number(a.name === 'PRIMARY') || a.name.localeCompare(b.name))
                    .map(index => ({ name: index.name, fieldIds: [...index.parts].sort((a, b) => a.position - b.position).map(part => part.fieldId!) }));
                return {
                    id: resource.id, schemaName: resource.schemaName, tableName: resource.tableName,
                    type: resource.type, comment: resource.comment, isSystem: resource.isServiceTable,
                    fields: fields.map(field => ({
                        id: field.id, name: field.name, dataType: field.dataType, nullable: field.nullable,
                        allowedDisplays: catalogDisplayTypeSchema.options.filter(type => isPageDisplayCompatible({ type }, field)),
                    })),
                    recordKeys,
                };
            }).sort((a, b) => Number(a.isSystem) - Number(b.isSystem) || a.tableName.localeCompare(b.tableName)),
    };
}
