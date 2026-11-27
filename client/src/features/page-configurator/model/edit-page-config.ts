import type { PageConfig, PageField } from '@auto-admin/contracts/pages';

// Removing a visible column must not remove a field still used by record details.
export function removeColumn(config: PageConfig, id: string): PageConfig {
    const detailUsesField = config.detail?.groups.some(group => group.fields.includes(id));
    const fields = detailUsesField ? config.fields : config.fields.filter(field => field.id !== id);
    const used = new Set(fields.flatMap(field => field.column ? [field.column.split('.')[0]] : []));
    const joins = config.joins?.slice().reverse().filter(join => {
        if (!used.has(join.alias)) return false;
        if (join.from) used.add(join.from);
        return true;
    }).reverse();
    return {
        ...config,
        fields,
        ...(joins ? { joins } : {}),
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
        fields: config.fields.some(item => item.id === field.id) ? config.fields.map(item => item.id === field.id ? field : item) : [...config.fields, field],
        list: { ...config.list, columns: [...config.list.columns, field.id],
            sorting: { ...config.list.sorting, allowed: [...new Set([...config.list.sorting.allowed, field.id])] },
        },
    };
}
