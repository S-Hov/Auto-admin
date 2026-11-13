import type { PageConfig, PageField } from '@auto-admin/contracts/pages';

// Removing a visible column must not remove a field still used by record details.
export function removeColumn(config: PageConfig, id: string): PageConfig {
    const detailUsesField = config.detail?.groups.some(group => group.fields.includes(id));
    return {
        ...config,
        fields: detailUsesField ? config.fields : config.fields.filter(field => field.id !== id),
        list: { ...config.list,
            columns: config.list.columns.filter(column => column !== id),
            sorting: {
                allowed: config.list.sorting.allowed.filter(field => field !== id),
                default: config.list.sorting.default.filter(sort => sort.field !== id),
            },
        },
    };
}

export function addColumn(config: PageConfig, field: PageField): PageConfig {
    return { ...config,
        fields: config.fields.some(item => item.id === field.id) ? config.fields : [...config.fields, field],
        list: { ...config.list, columns: [...config.list.columns, field.id],
            sorting: { ...config.list.sorting, allowed: [...new Set([...config.list.sorting.allowed, field.id])] },
        },
    };
}
