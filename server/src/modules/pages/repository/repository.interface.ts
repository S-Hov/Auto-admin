import type { CreatePageData } from "../schema/page-create.schema";

export interface PageRepository {
    create(config: CreatePageData, userId: number): Promise<number>;
}
