import type { CheckConnectionData } from '@auto-admin/contracts/install';
// UI legacy selector; the HTTP connection request itself is CheckConnectionData.
export type DbConnectionPayload = CheckConnectionData & { type: 'mysql' };
