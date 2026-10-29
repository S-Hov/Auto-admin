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

export interface PageListItem {
    pageId: number;
    name: string;
}

export interface PageListResult {
    items: PageListItem[];
    pagination: { limit: number; offset: number; hasMore: boolean };
}

export interface PageRowsResult {
    pageId: number;
    revision: number;
    rows: Record<string, unknown>[];
    pagination: { limit: number; offset: number; hasMore: boolean };
}
