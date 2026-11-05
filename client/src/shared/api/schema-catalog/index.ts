import { catalogResponseSchema } from '@auto-admin/contracts/schema-catalog';
import { apiClient } from '../apiClient';
import { schemaScanResponseSchema } from '@auto-admin/contracts/access-control';

export const schemaCatalog = {
    // Reuse the existing guarded scan operation; scanning is never a GET side effect.
    scan() {
        return apiClient('/access/scan', schemaScanResponseSchema, { method: 'POST' });
    },
    get(options?: { signal?: AbortSignal }) {
        return apiClient('/schema-catalog', catalogResponseSchema, { method: 'GET', signal: options?.signal });
    },
};
