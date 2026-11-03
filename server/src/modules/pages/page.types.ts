import type { PageData } from '@auto-admin/contracts/pages';
// Удаление и аудит сохраняют даже конфиг старой версии.
export type PageAuditSnapshot = Omit<PageData, 'config'> & { config: unknown };
