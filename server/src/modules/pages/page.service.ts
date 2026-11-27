import type { AccessPrincipal } from "../../core/access-control";
import type { AccessControlProvider } from "../../core/access-control/contracts/access-control-provider.interface";
import { requireSystemAdmin } from "../../core/access-control/policy/require-system-admin";
import { getActiveAccessControlProvider } from "../../core/access-control/runtime/access-control.runtime";
import { schemaCatalogService } from "../../core/schema-catalog";
import type { DatabaseExecutor } from "../../db/contracts/executor.interface";
import type { DatabaseProvider } from "../../db/contracts/provider.interface";
import { databaseRuntime } from "../../db/runtime/database.runtime";
import { ERROR_CODES } from "@auto-admin/contracts/common";
import {
    conflict,
    forbidden,
    notFound,
} from "../../shared/api/errors/error-helpers";
import type { ConfigureMenuPageData } from '@auto-admin/contracts/pages';
import { createMenuRepository } from '../menu/repository/repository.factory';
import type { MenuRepository } from '../menu/repository/repository.interface';
import type { PageData, PageListResult, PageRowsResult, PageUpdateResponse, PageListQuery, CreatePageData, UpdatePageData, PageRowsQuery } from "@auto-admin/contracts/pages";
import { PageReferencedByMenuError } from "./page.errors";
import { createPageRepository } from "./repository/repository.factory";
import type { PageRepository } from "./repository/repository.interface";
import { validatePageConfigAgainstCatalog } from "./schema/validate-page-config-against-catalog";
import { buildPageListQuery } from "./model/build-page-list-query";
import { queryEngineService } from "../../core/query-engine";
import { mapPageListRows } from './model/map-page-list-rows';
import { menuService, type MenuService } from '../menu/menu.service';

export class PageService {
    constructor(
        private readonly configuredDatabaseProvider?: DatabaseProvider,
        private readonly configuredAccessProvider?: AccessControlProvider,
        private readonly configuredRepository?: (
            executor: DatabaseExecutor,
        ) => PageRepository,
        private readonly navigation: Pick<MenuService, 'getMenu'> = menuService,
        private readonly configuredMenuRepository?: (executor: DatabaseExecutor) => MenuRepository,
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

            return this.createInTransaction(executor, data, principal, requestId);
        });
    }

    private async createInTransaction(executor: DatabaseExecutor, data: CreatePageData, principal: AccessPrincipal, requestId: string | null) {
        const repository = this.repository(executor);
        const pageId = await repository.create(data, principal.userId);
        await repository.appendAudit(pageId, 'create', principal.userId, null, { ...data, pageId, revision: 1 }, requestId);
        return { pageId, revision: 1 };
    }

    async configureForMenu(slug: string, data: ConfigureMenuPageData, principal: AccessPrincipal, requestId: string | null = null) {
        requireSystemAdmin(principal);
        if (data.mode === 'create') {
            validatePageConfigAgainstCatalog(data.page.config, await schemaCatalogService.getAuthorizationCatalog());
        }
        return this.database().transaction(async executor => {
            await this.checkSystemAdmin(executor, principal);
            const menuRepository = this.configuredMenuRepository?.(executor) ?? createMenuRepository(this.database().type, executor);
            // Same lock order as menu.save/page.delete: page first, then menu rows.
            let result: { pageId: number; revision: number };
            if (data.mode === 'create') {
                result = await this.createInTransaction(executor, data.page, principal, requestId);
            } else {
                if (!(await menuRepository.pageExistsForUpdate(data.pageId))) throw notFound();
                const page = await this.repository(executor).get(data.pageId);
                if (!page) throw notFound();
                result = { pageId: page.pageId, revision: page.revision };
            }
            const rows = await menuRepository.readAll(true);
            const item = rows.find(row => row.slug === slug);
            if (!item) throw notFound();
            const visited = new Set<number>();
            let current: typeof item | undefined = item;
            while (current) {
                if (!current.isActive || visited.has(current.id)) throw notFound();
                visited.add(current.id);
                if (current.parentId === null) break;
                current = rows.find(row => row.id === current!.parentId);
                if (!current) throw notFound();
            }
            if (item.pageId !== null) throw conflict();
            const { id, ...previous } = item;
            const next = { ...previous, pageId: result.pageId };
            await menuRepository.save(next, principal.userId, id);
            await menuRepository.appendAudit(id, 'update', principal.userId, item, { id, ...next }, requestId);
            return result;
        });
    }

    async getBySlug(slug: string, principal: AccessPrincipal): Promise<PageData> {
        requireSystemAdmin(principal);
        // Menu owns the navigation slug and ancestor visibility; pages owns
        // loading the linked page document and checking page access.
        const item = (await this.navigation.getMenu(principal)).find((item) => item.slug === slug);
        if (!item) throw notFound();
        if (item.pageId === null) throw notFound(ERROR_CODES.PAGE_NOT_CONFIGURED);
        return this.get(item.pageId, principal);
    }

    async get(pageId: number, principal: AccessPrincipal): Promise<PageData> {
        requireSystemAdmin(principal);

        const page = await this.repository(this.database()).get(pageId);
        if (!page) throw notFound();
        return page;
    }

    async list(query: PageListQuery, principal: AccessPrincipal): Promise<PageListResult> {
        requireSystemAdmin(principal);
        const rows = await this.repository(this.database()).list(query);
        return {
            items: rows.slice(0, query.limit).map(({ pageId, name }) => ({ pageId, name })),
            pagination: {
                limit: query.limit,
                offset: query.offset,
                hasMore: rows.length > query.limit,
            },
        };
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

    async getRows(pageId: number, params: PageRowsQuery, principal: AccessPrincipal): Promise<PageRowsResult> {
        requireSystemAdmin(principal);
        const page = await this.repository(this.database()).get(pageId);
        if (!page) throw notFound();

        const catalog = await schemaCatalogService.getAuthorizationCatalog();
        const query = buildPageListQuery(page.config, catalog, params);

        const { limit, offset } = query;
        const result = await queryEngineService.execute<Record<string, unknown>>(
            { ...query, limit: limit + 1 }, principal,
        );
        return {
            pageId,
            revision: page.revision,
            rows: mapPageListRows(page.config, catalog, result.rows.slice(0, limit)),
            pagination: {
                limit,
                offset,
                hasMore: result.rows.length > limit,
            },
        };
    }
}

export const pageService = new PageService();
