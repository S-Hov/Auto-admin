import type { AccessPrincipal } from "../../core/access-control";
import type { AccessControlProvider } from "../../core/access-control/contracts/access-control-provider.interface";
import { requireSystemAdmin } from "../../core/access-control/policy/require-system-admin";
import { getActiveAccessControlProvider } from "../../core/access-control/runtime/access-control.runtime";
import { schemaCatalogService } from "../../core/schema-catalog";
import type { DatabaseExecutor } from "../../db/contracts/executor.interface";
import type { DatabaseProvider } from "../../db/contracts/provider.interface";
import { databaseRuntime } from "../../db/runtime/database.runtime";
import { ERROR_CODES } from "../../shared/api/codes/error-codes";
import {
    conflict,
    forbidden,
    notFound,
} from "../../shared/api/errors/error-helpers";
import type { PageData, PageUpdateResponse } from "./page.types";
import { PageReferencedByMenuError } from "./page.errors";
import { createPageRepository } from "./repository/repository.factory";
import type { PageRepository } from "./repository/repository.interface";
import type { CreatePageData } from "./schema/page-create.schema";
import type { UpdatePageData } from "./schema/page-update.schema";
import { validatePageConfigAgainstCatalog } from "./schema/validate-page-config-against-catalog";

export class PageService {
    constructor(
        private readonly configuredDatabaseProvider?: DatabaseProvider,
        private readonly configuredAccessProvider?: AccessControlProvider,
        private readonly configuredRepository?: (
            executor: DatabaseExecutor,
        ) => PageRepository,
    ) {}
    private database() {
        return this.configuredDatabaseProvider ?? databaseRuntime.getProvider();
    }
    private repository(executor: DatabaseExecutor) {
        return (
            this.configuredRepository?.(executor) ??
            createPageRepository(this.database().type, executor)
        );
    }
    private async checkSystemAdmin(
        executor: DatabaseExecutor,
        principal: AccessPrincipal,
    ): Promise<void> {
        const access = (
            this.configuredAccessProvider ?? getActiveAccessControlProvider()
        ).createRepository(executor);

        if (!(await access.isActiveSystemAdminForUpdate(principal.userId)))
            throw forbidden(ERROR_CODES.ACCESS_ADMIN_REQUIRED);
    }

    async create(
        data: CreatePageData,
        principal: AccessPrincipal,
        requestId: string | null = null,
    ): Promise<{ pageId: number; revision: number }> {
        requireSystemAdmin(principal);
        const catalog = await schemaCatalogService.getAuthorizationCatalog();
        validatePageConfigAgainstCatalog(data.config, catalog);

        return await this.database().transaction(async (executor) => {
            await this.checkSystemAdmin(executor, principal);

            const repository = this.repository(executor);

            const pageId = await repository.create(data, principal.userId);

            await repository.appendAudit(
                pageId,
                "create",
                principal.userId,
                null,
                { ...data, pageId, revision: 1 },
                requestId,
            );

            return {
                pageId,
                revision: 1,
            };
        });
    }

    async get(pageId: number, principal: AccessPrincipal): Promise<PageData> {
        requireSystemAdmin(principal);

        const page = await this.repository(this.database()).get(pageId);
        if (!page) throw notFound();
        return page;
    }

    async update(
        id: number,
        data: UpdatePageData,
        principal: AccessPrincipal,
        requestId: string | null = null,
    ): Promise<PageUpdateResponse> {
        requireSystemAdmin(principal);
        
        const catalog = await schemaCatalogService.getAuthorizationCatalog();
        validatePageConfigAgainstCatalog(data.config, catalog);

        return await this.database().transaction(async (executor) => {
            await this.checkSystemAdmin(executor, principal);

            const repository = this.repository(executor);

            const oldPage = await repository.get(id);

            if (!oldPage) throw notFound();

            if (oldPage.revision !== data.revision) throw conflict();

            const newRevision = data.revision + 1;
            const update = await repository.update(
                id,
                data,
                principal.userId,
            );

            if (!update) throw conflict();

            await repository.appendAudit(
                id,
                "update",
                principal.userId,
                oldPage,
                { ...data, pageId: id, revision: newRevision },
                requestId,
            );

            return { pageId: id, revision: newRevision };
        });
    }

    async delete(
        pageId: number,
        principal: AccessPrincipal,
        requestId: string | null = null,
    ): Promise<{ deleted: true }> {
        requireSystemAdmin(principal);

        return this.database().transaction(async (executor) => {
            await this.checkSystemAdmin(executor, principal);
            const repository = this.repository(executor);
            const previous = await repository.getForDeletion(pageId);
            if (!previous) throw notFound();

            if (await repository.hasMenuReferences(pageId)) throw conflict();

            try {
                if (!(await repository.delete(pageId))) throw notFound();
            } catch (error) {
                if (error instanceof PageReferencedByMenuError) throw conflict();
                throw error;
            }

            await repository.appendAudit(
                pageId, "delete", principal.userId, previous, null, requestId,
            );
            return { deleted: true };
        });
    }
}

export const pageService = new PageService();
