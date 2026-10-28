import type { CreatePageData } from "./schema/page-create.schema"

export type PageData = CreatePageData & {
    pageId: number,
    revision: number,
}

export interface PageUpdateResponse {
    pageId: number,
    revision: number,
}

// Аудит удаления должен сохранять и старые конфиги, не поддерживаемые текущей схемой.
export type PageAuditSnapshot = Omit<PageData, "config"> & { config: unknown };
