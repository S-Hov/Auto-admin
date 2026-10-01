import { databaseRuntime } from "../../db/runtime/database.runtime";
import type { DatabaseProvider } from "../../db/contracts/provider.interface";
import type { DatabaseExecutor } from "../../db/contracts/executor.interface";
import type { AccessControlProvider } from "../../core/access-control/contracts/access-control-provider.interface";
import type { AccessPrincipal } from "../../core/access-control";
import { isSystemAdmin } from "../../core/access-control";
import { requireSystemAdmin } from "../../core/access-control/policy/require-system-admin";
import { getActiveAccessControlProvider } from "../../core/access-control/runtime/access-control.runtime";
import { createMenuRepository } from "./repository/menu-repository.factory";
import type { MenuRepository } from "./repository/menu-repository.interface";
import type { MenuVisibilityRow } from "./menu.types";
import { parseMenuSave, parseMenuPermissions } from "./schema/menu.schema";
import { positiveIdSchema } from "../../core/access-control/schema/permission.schema";
import {
    badRequest,
    forbidden,
    unauthorized,
} from "../../shared/api/errors/error-helpers";
import { ERROR_CODES } from "../../shared/api/codes/error-codes";

export class MenuService {
    constructor(
        private readonly configuredDatabaseProvider?: DatabaseProvider,
        private readonly configuredAccessProvider?: AccessControlProvider,
        private readonly configuredRepository?: (
            executor: DatabaseExecutor,
        ) => MenuRepository,
    ) {}

    private database() {
        return this.configuredDatabaseProvider ?? databaseRuntime.getProvider();
    }
    private repository(executor: DatabaseExecutor) {
        return (
            this.configuredRepository?.(executor) ??
            createMenuRepository(this.database().type, executor)
        );
    }

    private async manage<T>(
        principal: AccessPrincipal,
        callback: (
            repository: MenuRepository,
            executor: DatabaseExecutor,
        ) => Promise<T>,
    ): Promise<T> {
        requireSystemAdmin(principal);
        return this.database().transaction(async (executor) => {
            const access = (
                this.configuredAccessProvider ??
                getActiveAccessControlProvider()
            ).createRepository(executor);
            if (!(await access.isActiveSystemAdminForUpdate(principal.userId)))
                throw forbidden(ERROR_CODES.ACCESS_ADMIN_REQUIRED);
            return callback(this.repository(executor), executor);
        });
    }

    async getManageableMenu(principal: AccessPrincipal) {
        return this.manage(principal, (repository) => repository.readAll());
    }

    async getMenu(principal: AccessPrincipal): Promise<MenuVisibilityRow[]> {
        if (!principal) throw unauthorized();
        const repository = this.repository(this.database());
        const rows = isSystemAdmin(principal)
            ? (await repository.readAll()).map((item) => ({
                  ...item,
                  canView: true,
                  canCreate: true,
                  canUpdate: true,
                  canDelete: true,
              }))
            : await repository.readForUser(principal.userId, principal.roleId);
        const byId = new Map(rows.map((item) => [item.id, item]));
        const visible = (item: MenuVisibilityRow): boolean => {
            const visited = new Set<number>();
            let current: MenuVisibilityRow | undefined = item;
            while (current) {
                if (
                    !current.isActive ||
                    !current.canView ||
                    visited.has(current.id)
                )
                    return false;
                visited.add(current.id);
                if (current.parentId === null) return true;
                current = byId.get(current.parentId);
            }
            return false;
        };
        return rows.filter(visible);
    }

    async save(
        input: unknown,
        principal: AccessPrincipal,
        requestId: string | null = null,
    ) {
        requireSystemAdmin(principal);
        const { id, ...data } = parseMenuSave(input);
        return this.manage(principal, async (repository) => {
            const rows = await repository.readAll(true);
            if (rows.length >= 500 && id === undefined)
                throw badRequest(ERROR_CODES.MENU_INVALID);
            const previous =
                id === undefined ? null : rows.find((item) => item.id === id);
            if (id !== undefined && !previous)
                throw badRequest(ERROR_CODES.MENU_INVALID);
            if (rows.some((item) => item.slug === data.slug && item.id !== id))
                throw badRequest(ERROR_CODES.MENU_INVALID);
            const visited = new Set<number>();
            let parentId = data.parentId;
            while (parentId !== null) {
                if (parentId === id || visited.has(parentId))
                    throw badRequest(ERROR_CODES.MENU_INVALID);
                visited.add(parentId);
                const parent = rows.find((item) => item.id === parentId);
                if (!parent) throw badRequest(ERROR_CODES.MENU_INVALID);
                parentId = parent.parentId;
            }
            const menuId = await repository.save(data, principal.userId, id);
            await repository.appendAudit(
                menuId,
                id === undefined ? "create" : "update",
                principal.userId,
                previous ?? null,
                { id: menuId, ...data },
                requestId,
            );
            return { id: menuId };
        });
    }

    async delete(
        input: unknown,
        principal: AccessPrincipal,
        requestId: string | null = null,
    ) {
        requireSystemAdmin(principal);
        const id = positiveIdSchema.safeParse(input);
        if (!id.success) throw badRequest(ERROR_CODES.MENU_INVALID);
        return this.manage(principal, async (repository) => {
            const rows = await repository.readAll(true);
            const previous = rows.find((item) => item.id === id.data);
            if (!previous || rows.some((item) => item.parentId === id.data))
                throw badRequest(ERROR_CODES.MENU_INVALID);
            await repository.delete(id.data);
            await repository.appendAudit(
                id.data,
                "delete",
                principal.userId,
                previous,
                null,
                requestId,
            );
            return { deleted: true };
        });
    }

    async changePermissions(
        input: unknown,
        principal: AccessPrincipal,
        requestId: string | null = null,
    ) {
        requireSystemAdmin(principal);
        const change = parseMenuPermissions(input);
        return this.manage(principal, async (repository, executor) => {
            const rows = await repository.readAll(true);
            if (!rows.some((item) => item.id === change.menuId))
                throw badRequest(ERROR_CODES.MENU_INVALID);
            const access = (
                this.configuredAccessProvider ??
                getActiveAccessControlProvider()
            ).createRepository(executor);
            if (
                !(await access.subjectExists(
                    change.subjectType,
                    change.subjectId,
                ))
            )
                throw badRequest(ERROR_CODES.MENU_INVALID);
            const previous = await repository.getPermissions(change);
            if (JSON.stringify(previous) === JSON.stringify(change.permissions))
                return { changed: false };
            await repository.setPermissions(change);
            const subject = {
                subjectType: change.subjectType,
                subjectId: change.subjectId,
            };
            await repository.appendAudit(
                change.menuId,
                "permission",
                principal.userId,
                { ...subject, permissions: previous },
                { ...subject, permissions: change.permissions },
                requestId,
            );
            return { changed: true };
        });
    }
}

export const menuService = new MenuService();
