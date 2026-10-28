import type { PageData } from "../page.types";
import type { CreatePageData } from "../schema/page-create.schema";
import type { UpdatePageData } from "../schema/page-update.schema";

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

    get(id: number): Promise<PageData | null>;

    update(
        id: number,
        data: UpdatePageData,
        userId: number,
    ): Promise<boolean>;
}
