import type { CreatePageData } from "../schema/page-create.schema";

export interface PageRepository {
    create(config: CreatePageData, userId: number): Promise<number>;

    appendAudit(
        pageId: number,
        action: "create" | "update" | "delete",
        actorUserId: number,
        previous: unknown,
        newValue: unknown,
        requestId: string | null,
    ): Promise<void>;
}
