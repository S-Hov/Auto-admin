import type { CreatePageData } from "./schema/page-create.schema"

export type PageData = CreatePageData & {
    pageId: number,
    revision: number,
}

export interface PageUpdateResponse {
    pageId: number,
    revision: number,
}