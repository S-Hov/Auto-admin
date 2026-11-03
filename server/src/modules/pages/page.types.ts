import type { PageData } from '@auto-admin/contracts/pages';
export type { PageData, PageUpdateResponse, PageListItem, PageListResult, PageRowsResult } from '@auto-admin/contracts/pages';
// Удаление и аудит сохраняют даже конфиг старой версии.
export type PageAuditSnapshot = Omit<PageData, 'config'> & { config: unknown };
