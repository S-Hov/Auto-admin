import type { PageAuditSnapshot, PageData } from "../page.types";
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

    /** Вызывается внутри транзакции; блокирует страницу до удаления и аудита. */
    getForDeletion(id: number): Promise<PageAuditSnapshot | null>;
    hasMenuReferences(id: number): Promise<boolean>;
    delete(id: number): Promise<boolean>;

    update(
        id: number,
        data: UpdatePageData,
        userId: number,
    ): Promise<boolean>;
}
