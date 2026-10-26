import type { AccessPrincipal } from "../../core/access-control";
import type { AccessControlProvider } from "../../core/access-control/contracts/access-control-provider.interface";
import { requireSystemAdmin } from "../../core/access-control/policy/require-system-admin";
import { getActiveAccessControlProvider } from "../../core/access-control/runtime/access-control.runtime";
import { schemaCatalogService } from "../../core/schema-catalog";
import type { DatabaseExecutor } from "../../db/contracts/executor.interface";
import type { DatabaseProvider } from "../../db/contracts/provider.interface";
import { databaseRuntime } from "../../db/runtime/database.runtime";
import { ERROR_CODES } from "../../shared/api/codes/error-codes";
import { forbidden } from "../../shared/api/errors/error-helpers";
import { createPageRepository } from "./repository/repository.factory";
import type { PageRepository } from "./repository/repository.interface";
import type { CreatePageData } from "./schema/page-create.schema";
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

    async create(
        data: CreatePageData,
        principal: AccessPrincipal,
        requestId: string | null = null,
    ): Promise<{pageId: number, revision: number}> {
        requireSystemAdmin(principal);
        const catalog = await schemaCatalogService.getAuthorizationCatalog();
        validatePageConfigAgainstCatalog(data.config, catalog);

        return await this.database().transaction(async (executor) => {
            const access = (
                this.configuredAccessProvider ??
                getActiveAccessControlProvider()
            ).createRepository(executor);
            if (!(await access.isActiveSystemAdminForUpdate(principal.userId)))
                throw forbidden(ERROR_CODES.ACCESS_ADMIN_REQUIRED);
            const pageId = await this.repository(executor).create(
                data,
                principal.userId,
            );

            this.repository(executor).appendAudit(
                pageId,
                "create",
                principal.userId,
                null,
                data.config,
                requestId,
            );

            return {
                pageId,
                revision: 1
            }
        });
    }
}

export const pageService = new PageService();
