import { catalog } from './access.fixture';
import type { CreatePageData } from '../../src/modules/pages/schema/page-create.schema';

export function pageData(): CreatePageData {
    return {
        name: 'Заказы', description: null,
        config: {
            schemaVersion: 1,
            source: { resourceId: 1, recordKey: null },
            fields: [{ id: 'total', fieldId: 3, label: 'Сумма', display: { type: 'number' } }],
            list: {
                columns: ['total'], sorting: { allowed: ['total'], default: [] },
                pagination: { defaultPageSize: 25, pageSizeOptions: [25, 50] },
            },
        },
    };
}

export const pageCatalog = catalog;
