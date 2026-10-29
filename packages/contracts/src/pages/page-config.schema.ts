import { z } from 'zod';

export const PAGE_CONFIG_LIMITS = {
    fields: 100,
    groups: 20,
    recordKeyFields: 16,
    sortFields: 5,
    pageSize: 100,
    pageSizeOptions: 10,
} as const;

const catalogIdSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const elementIdSchema = z.string().min(1).max(64).regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/);
const labelSchema = z.string().trim().min(1).max(100);

export const pageFieldDisplaySchema = z.discriminatedUnion('type', [
    z.strictObject({ type: z.literal('text') }),
    z.strictObject({ type: z.literal('number'), fractionDigits: z.number().int().min(0).max(20).optional() }),
    z.strictObject({ type: z.literal('date') }),
    z.strictObject({ type: z.literal('datetime') }),
    z.strictObject({ type: z.literal('boolean') }),
    z.strictObject({ type: z.literal('image') }),
    z.strictObject({ type: z.literal('link') }),
]);

export const pageFieldSchema = z.strictObject({
    id: elementIdSchema,
    fieldId: catalogIdSchema,
    label: labelSchema,
    display: pageFieldDisplaySchema,
});

export const pageSourceSchema = z.strictObject({
    resourceId: catalogIdSchema,
    // Отсутствие ключа указывается явно. Сам ключ проверяется по schema-catalog.
    recordKey: z.array(catalogIdSchema).min(1).max(PAGE_CONFIG_LIMITS.recordKeyFields).nullable(),
});

export const pageListSchema = z.strictObject({
    columns: z.array(elementIdSchema).min(1).max(PAGE_CONFIG_LIMITS.fields),
    sorting: z.strictObject({
        allowed: z.array(elementIdSchema).max(PAGE_CONFIG_LIMITS.fields),
        default: z.array(z.strictObject({
            field: elementIdSchema,
            direction: z.enum(['asc', 'desc']),
        })).max(PAGE_CONFIG_LIMITS.sortFields),
    }),
    pagination: z.strictObject({
        defaultPageSize: z.number().int().min(1).max(PAGE_CONFIG_LIMITS.pageSize),
        pageSizeOptions: z.array(z.number().int().min(1).max(PAGE_CONFIG_LIMITS.pageSize))
            .min(1).max(PAGE_CONFIG_LIMITS.pageSizeOptions),
    }),
});

export const pageDetailSchema = z.strictObject({
    groups: z.array(z.strictObject({
        id: elementIdSchema,
        label: labelSchema,
        fields: z.array(elementIdSchema).min(1).max(PAGE_CONFIG_LIMITS.fields),
    })).min(1).max(PAGE_CONFIG_LIMITS.groups),
});

/**
 * Проверяет формат и внутренние ссылки документа без обращения к БД.
 * Существование ресурсов, принадлежность полей, типы, ключи и права проверяет сервис.
 * Поддержка renderer на клиенте и безопасность отображаемых URL — отдельные проверки.
 */
export const pageConfigSchema = z.strictObject({
    schemaVersion: z.literal(1),
    source: pageSourceSchema,
    fields: z.array(pageFieldSchema).min(1).max(PAGE_CONFIG_LIMITS.fields),
    list: pageListSchema,
    detail: pageDetailSchema.optional(),
}).superRefine((config, ctx) => {
    const issue = (path: (string | number)[], message: string) => {
        ctx.addIssue({ code: 'custom', path, message });
    };
    const unique = (values: readonly (string | number)[], path: (string | number)[]) => {
        const seen = new Set<string | number>();
        values.forEach((value, index) => {
            if (seen.has(value)) issue([...path, index], 'Duplicate value');
            seen.add(value);
        });
    };
    const fieldIds = new Set(config.fields.map((field) => field.id));
    const references = (values: readonly string[], path: (string | number)[]) => {
        unique(values, path);
        values.forEach((id, index) => {
            if (!fieldIds.has(id)) issue([...path, index], 'Unknown page field');
        });
    };

    config.fields.forEach((field, index) => {
        if (config.fields.findIndex((other) => other.id === field.id) !== index) {
            issue(['fields', index, 'id'], 'Duplicate page field ID');
        }
    });
    if (config.source.recordKey) unique(config.source.recordKey, ['source', 'recordKey']);
    references(config.list.columns, ['list', 'columns']);
    references(config.list.sorting.allowed, ['list', 'sorting', 'allowed']);
    unique(config.list.sorting.default.map((sort) => sort.field), ['list', 'sorting', 'default']);
    const allowedSorts = new Set(config.list.sorting.allowed);
    config.list.sorting.default.forEach((sort, index) => {
        if (!allowedSorts.has(sort.field)) {
            issue(['list', 'sorting', 'default', index, 'field'], 'Default sorting must be allowed');
        }
    });

    const pagination = config.list.pagination;
    unique(pagination.pageSizeOptions, ['list', 'pagination', 'pageSizeOptions']);
    if (!pagination.pageSizeOptions.includes(pagination.defaultPageSize)) {
        issue(['list', 'pagination', 'defaultPageSize'], 'Default page size must be one of the options');
    }

    if (config.detail) {
        if (config.source.recordKey === null) issue(['detail'], 'Record details require a record key');
        unique(config.detail.groups.map((group) => group.id), ['detail', 'groups']);
        config.detail.groups.forEach((group, index) => {
            references(group.fields, ['detail', 'groups', index, 'fields']);
        });
    }
});

export type PageConfig = z.infer<typeof pageConfigSchema>;
export type PageSource = z.infer<typeof pageSourceSchema>;
export type PageField = z.infer<typeof pageFieldSchema>;
export type PageFieldDisplay = z.infer<typeof pageFieldDisplaySchema>;
export type PageList = z.infer<typeof pageListSchema>;
export type PageDetail = z.infer<typeof pageDetailSchema>;
