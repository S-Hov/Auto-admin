import { createPageSchema, type CreatePageData } from '@auto-admin/contracts/pages';
import type { CatalogDisplayType, CatalogResource } from '@auto-admin/contracts/schema-catalog';

export interface FieldDraft {
    fieldId: number;
    selected: boolean;
    label: string;
    display: CatalogDisplayType;
}

export function createFieldDrafts(resource: CatalogResource): FieldDraft[] {
    return resource.fields.map((field, index) => ({
        fieldId: field.id,
        selected: index < 10 && field.allowedDisplays.length > 0,
        label: field.name.slice(0, 100),
        display: field.allowedDisplays.includes('boolean') ? 'boolean' : field.allowedDisplays.find(type => type !== 'text' && type !== 'image' && type !== 'link') ?? 'text',
    }));
}

/** Form state may be incomplete; only this boundary creates a valid PageConfig. */
export function buildPageData(input: {
    resource: CatalogResource; name: string; description: string; fields: FieldDraft[];
    keyName: string; pageSize: number; sortFieldId: number | null; sortDirection: 'asc' | 'desc';
}): CreatePageData {
    const { resource } = input;
    if (resource.isSystem) throw new Error('Системные таблицы нельзя использовать как источник страницы');
    const fields = input.fields.filter(field => field.selected).map(field => {
        const source = resource.fields.find(item => item.id === field.fieldId);
        if (!source || !source.allowedDisplays.includes(field.display)) throw new Error('Недопустимый формат поля');
        return { id: `field_${field.fieldId}`, fieldId: field.fieldId, label: field.label.trim() || source.name.slice(0, 100), display: { type: field.display } };
    });
    const key = resource.recordKeys.find(item => item.name === input.keyName);
    if (input.keyName && !key) throw new Error('Выбранный ключ записи отсутствует');
    return createPageSchema.parse({
        name: input.name,
        description: input.description.trim() || null,
        config: {
            schemaVersion: 1,
            source: { resourceId: resource.id, recordKey: key?.fieldIds ?? null },
            fields,
            list: {
                columns: fields.map(field => field.id),
                sorting: {
                    allowed: fields.map(field => field.id),
                    default: input.sortFieldId === null ? [] : [{ field: `field_${input.sortFieldId}`, direction: input.sortDirection }],
                },
                pagination: { defaultPageSize: input.pageSize, pageSizeOptions: [10, 25, 50, 100] },
            },
        },
    });
}
