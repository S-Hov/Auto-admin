import { describe, it, expect, vi } from "vitest";
import {
    admin,
    manager,
    database,
    repository,
} from "../../../tests/fixtures/access.fixture";
import { MenuService } from "./menu.service";
import { pageService } from "../pages/page.service";
import { pageData } from "../../../tests/fixtures/page.fixture";
import type { MenuItem, MenuVisibilityRow } from "./menu.types";
import type { MenuRepository } from "./repository/repository.interface";
import type { MenuPermissionData } from "@auto-admin/contracts/menu";

const item = (id: number, parentId: number | null = null): MenuItem => ({
    id,
    parentId,
    pageId: null,
    name: `Menu ${id}`,
    slug: `menu-${id}`,
    icon: null,
    iconType: "icon",
    sortOrder: id,
    isActive: true,
});

const resolvedPage = { ...pageData(), pageId: 42, revision: 3 };

describe('menu page resolution', () => {
    it('returns the same page by menu ID and slug, loading the bound page ID', async () => {
        const h = harness([{ ...item(7), pageId: 42 }]);
        const byId = await h.service.resolveId(7, admin);
        const bySlug = await h.service.resolveSlug('menu-7', admin);
        expect(byId).toEqual(resolvedPage);
        expect(bySlug).toEqual(byId);
        expect(h.getPage).toHaveBeenCalledTimes(2);
        expect(h.getPage).toHaveBeenCalledWith(42, admin);
    });
    it.each(['id', 'slug'])('preserves the page service access checks for lookup by %s', async (lookup) => {
        const h = harness([{ ...item(1), pageId: 42 }]);
        h.getPage.mockImplementation((id, principal) => pageService.get(id, principal));
        const result = lookup === 'id' ? h.service.resolveId(1, manager) : h.service.resolveSlug('menu-1', manager);
        await expect(result).rejects.toMatchObject({ status: 403, code: 'ACCESS.ADMIN_REQUIRED' });
        expect(h.getPage).toHaveBeenCalledWith(42, manager);
    });
    it.each(['id', 'slug'])('propagates page load errors for lookup by %s', async (lookup) => {
        const h = harness([{ ...item(1), pageId: 42 }]);
        const error = new Error('Page load failed');
        h.getPage.mockRejectedValue(error);
        await expect(lookup === 'id' ? h.service.resolveId(1, admin) : h.service.resolveSlug('menu-1', admin)).rejects.toBe(error);
    });
    it('resolves a visible bound menu item for a regular user through the existing repository', async () => {
        const h = harness([{ ...item(1), pageId: 42 }]);
        await expect(h.service.resolveSlug('menu-1', manager)).resolves.toEqual(resolvedPage);
        expect(h.repo.readForUser).toHaveBeenCalledWith(manager.userId, manager.roleId);
        expect(h.repo.readAll).not.toHaveBeenCalled();
        expect(h.transaction).not.toHaveBeenCalled();
    });
    it('allows two slugs to resolve to the same page', async () => {
        const h = harness([{ ...item(1), pageId: 42 }, { ...item(2), pageId: 42 }]);
        await expect(h.service.resolveSlug('menu-1', admin)).resolves.toEqual(resolvedPage);
        await expect(h.service.resolveSlug('menu-2', admin)).resolves.toEqual(resolvedPage);
    });
    it.each([
        [],
        [item(1)],
        [{ ...item(1), pageId: 42, isActive: false }],
        [{ ...item(1, 999), pageId: 42 }],
        [{ ...item(2), isActive: false }, { ...item(1, 2), pageId: 42 }],
        [item(2, 1), { ...item(1, 2), pageId: 42 }],
    ].map((rows) => ({ rows })))('returns 404 for missing, unbound or structurally hidden destinations: $rows', async ({ rows }) => {
        const h = harness(rows);
        await expect(h.service.resolveSlug('menu-1', admin)).rejects.toMatchObject({ status: 404, code: 'COMMON.NOT_FOUND' });
        await expect(h.service.resolveId(1, admin)).rejects.toMatchObject({ status: 404, code: 'COMMON.NOT_FOUND' });
        expect(h.getPage).not.toHaveBeenCalled();
    });
    it.each([1, 2])('does not bypass denied visibility on node %s', async (deniedId) => {
        const h = harness();
        vi.mocked(h.repo.readForUser).mockResolvedValue([
            { ...visible(1, 2), pageId: 42, canView: deniedId !== 1 },
            { ...visible(2), canView: deniedId !== 2 },
        ]);
        await expect(h.service.resolveSlug('menu-1', manager)).rejects.toMatchObject({ status: 404 });
        await expect(h.service.resolveId(1, manager)).rejects.toMatchObject({ status: 404 });
        expect(h.getPage).not.toHaveBeenCalled();
    });
    it('preserves repository errors instead of reporting a missing destination', async () => {
        const h = harness();
        const error = new Error('Read failed');
        vi.mocked(h.repo.readForUser).mockRejectedValue(error);
        await expect(h.service.resolveSlug('menu-1', manager)).rejects.toBe(error);
    });
});

describe('menu page binding', () => {
    it('creates a menu item bound to an existing page and audits the binding', async () => {
        const h = harness();
        const { id: _id, ...data } = { ...item(3), pageId: 42 };
        await h.service.save(data, admin, 'bind-request');
        expect(h.repo.pageExistsForUpdate).toHaveBeenCalledWith(42);
        expect(vi.mocked(h.repo.pageExistsForUpdate).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(h.repo.readAll).mock.invocationCallOrder[0]);
        expect(h.repo.save).toHaveBeenCalledWith(data, admin.userId, undefined);
        expect(h.repo.appendAudit).toHaveBeenCalledWith(3, 'create', admin.userId, null, { ...data, id: 3 }, 'bind-request');
        expect(h.transaction).toHaveBeenCalledOnce();
    });

    it('rejects a nonexistent page without saving or auditing', async () => {
        const h = harness();
        vi.mocked(h.repo.pageExistsForUpdate).mockResolvedValue(false);
        await expect(h.service.save({ ...item(2, 1), pageId: 999 }, admin)).rejects.toMatchObject({ status: 400, code: 'MENU.INVALID' });
        expect(h.repo.save).not.toHaveBeenCalled();
        expect(h.repo.appendAudit).not.toHaveBeenCalled();
    });

    it('preserves the old binding when an older client omits pageId during a move', async () => {
        const previous = { ...item(2, 1), pageId: 42 };
        const h = harness([item(1), previous]);
        const { pageId: _pageId, ...data } = previous;
        await h.service.save({ ...data, parentId: null }, admin);
        expect(h.repo.pageExistsForUpdate).not.toHaveBeenCalled();
        const { id: _id, ...savedData } = data;
        expect(h.repo.save).toHaveBeenCalledWith({ ...savedData, parentId: null, pageId: 42 }, admin.userId, 2);
        expect(h.repo.appendAudit).toHaveBeenCalledWith(2, 'update', admin.userId, previous, { ...previous, parentId: null }, null);
    });

    it('defaults a newly created item without pageId to an unbound group', async () => {
        const h = harness();
        const { id: _id, pageId: _pageId, ...data } = item(3);
        await h.service.save(data, admin);
        expect(h.repo.save).toHaveBeenCalledWith({ ...data, pageId: null }, admin.userId, undefined);
        expect(h.repo.pageExistsForUpdate).not.toHaveBeenCalled();
    });

    it('explicit null removes an existing binding', async () => {
        const previous = { ...item(2, 1), pageId: 42 };
        const h = harness([item(1), previous]);
        await h.service.save({ ...previous, pageId: null }, admin);
        const { id: _id, ...data } = { ...previous, pageId: null };
        expect(h.repo.save).toHaveBeenCalledWith(data, admin.userId, 2);
        expect(h.repo.pageExistsForUpdate).not.toHaveBeenCalled();
        expect(h.repo.appendAudit).toHaveBeenCalledWith(2, 'update', admin.userId, previous, { ...data, id: 2 }, null);
    });

    it('can replace one page binding with another', async () => {
        const previous = { ...item(2, 1), pageId: 42 };
        const h = harness([item(1), previous]);
        await h.service.save({ ...previous, pageId: 43 }, admin);
        expect(h.repo.pageExistsForUpdate).toHaveBeenCalledWith(43);
        expect(h.repo.save).toHaveBeenCalledWith(expect.objectContaining({ pageId: 43 }), admin.userId, 2);
    });

    it('returns the binding in manageable and visible menus', async () => {
        const h = harness([{ ...item(1), pageId: 42 }]);
        expect((await h.service.getManageableMenu(admin))[0].pageId).toBe(42);
        expect((await h.service.getMenu(admin))[0].pageId).toBe(42);
        expect((await h.service.getMenu(manager))[0].pageId).toBe(42);
    });

    it('does not check pages or change a binding for an unauthorized caller', async () => {
        const h = harness();
        await expect(h.service.save({ ...item(2, 1), pageId: 42 }, manager)).rejects.toMatchObject({ status: 403 });
        expect(h.repo.pageExistsForUpdate).not.toHaveBeenCalled();
        expect(h.repo.save).not.toHaveBeenCalled();
    });

    it('preserves page lookup errors instead of reporting them as invalid input', async () => {
        const h = harness();
        const error = new Error('Page lookup failed');
        vi.mocked(h.repo.pageExistsForUpdate).mockRejectedValue(error);
        await expect(h.service.save({ ...item(2, 1), pageId: 42 }, admin)).rejects.toBe(error);
        expect(h.repo.save).not.toHaveBeenCalled();
    });

    it('rejects the transaction if binding audit cannot be written', async () => {
        const h = harness();
        const error = new Error('Binding audit failed');
        vi.mocked(h.repo.appendAudit).mockRejectedValue(error);
        await expect(h.service.save({ ...item(2, 1), pageId: 42 }, admin)).rejects.toBe(error);
    });
});
const visible = (
    id: number,
    parentId: number | null = null,
): MenuVisibilityRow => ({
    ...item(id, parentId),
    canView: true,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
});
function harness(rows: MenuItem[] = [item(1), item(2, 1)]) {
    const db = database(),
        access = repository();
    const repo: MenuRepository = {
        readAll: vi.fn(async () => rows),
        pageExistsForUpdate: vi.fn(async () => true),
        readForUser: vi.fn(async () =>
            rows.map((row) => ({
                ...row,
                canView: true,
                canCreate: false,
                canUpdate: false,
                canDelete: false,
            })),
        ),
        save: vi.fn(async (_data, _actor, id) => id ?? 3),
        delete: vi.fn(async () => {}),
        getPermissions: vi.fn(async () => null),
        setPermissions: vi.fn(async () => {}),
        appendAudit: vi.fn(async () => {}),
    };
    const getPage = vi.fn<typeof pageService.get>(async () => resolvedPage);
    const service = new MenuService(
        db.provider,
        { type: "mysql", createRepository: () => access },
        () => repo,
        { get: getPage },
    );
    return { ...db, access, repo, service, getPage };
}

describe("menu management and navigation", () => {
    it("writes item and audit through one transaction", async () => {
        const h = harness();
        const { id: _id, ...data } = item(3);
        await expect(h.service.save(data, admin, "request-1")).resolves.toEqual(
            { id: 3 },
        );
        expect(h.repo.appendAudit).toHaveBeenCalledWith(
            3,
            "create",
            1,
            null,
            item(3),
            "request-1",
        );
        expect(h.transaction).toHaveBeenCalledOnce();
    });
    it("does not grant menu management to a non-admin", async () => {
        const h = harness();
        await expect(h.service.save(item(1), manager)).rejects.toMatchObject({
            status: 403,
        });
        await expect(h.service.delete(1, manager)).rejects.toMatchObject({
            status: 403,
        });
        expect(h.repo.save).not.toHaveBeenCalled();
    });
    it("rejects cycles, unknown parents and duplicate slugs", async () => {
        const h = harness();
        for (const input of [
            { ...item(1), parentId: 2 },
            { ...item(2), parentId: 99 },
            { ...item(2), slug: "menu-1" },
        ]) {
            await expect(h.service.save(input, admin)).rejects.toMatchObject({
                status: 400,
            });
        }
        expect(h.repo.save).not.toHaveBeenCalled();
    });
    it("only deletes leaf items, so cascade cannot silently delete subtrees", async () => {
        const h = harness();
        await expect(h.service.delete(1, admin)).rejects.toMatchObject({
            status: 400,
        });
        await h.service.delete(2, admin);
        expect(h.repo.delete).toHaveBeenCalledWith(2);
        expect(h.repo.appendAudit).toHaveBeenCalledWith(
            2,
            "delete",
            1,
            item(2, 1),
            null,
            null,
        );
    });
    it("rejects an administrator revoked after the HTTP access check", async () => {
        const h = harness();
        vi.mocked(h.access.isActiveSystemAdminForUpdate).mockResolvedValue(false);
        await expect(h.service.save(item(1), admin)).rejects.toMatchObject({ status: 403 });
        await expect(h.service.delete(2, admin)).rejects.toMatchObject({ status: 403 });
        expect(h.repo.save).not.toHaveBeenCalled();
        expect(h.repo.delete).not.toHaveBeenCalled();
        expect(h.repo.appendAudit).not.toHaveBeenCalled();
    });
    it("filters children of a hidden or inactive parent, plus orphaned/cyclic entries", async () => {
        const h = harness();
        vi.mocked(h.repo.readForUser).mockResolvedValueOnce([
            { ...visible(1), canView: false },
            visible(2, 1),
            visible(3),
            visible(4, 99),
            visible(5, 6),
            visible(6, 5),
            { ...visible(7), isActive: false },
            visible(8, 7),
        ]);
        expect(
            (await h.service.getMenu(manager)).map((item) => item.id),
        ).toEqual([3]);
    });
    it("changes navigation permissions with audit without touching data permissions", async () => {
        const h = harness();
        const change: MenuPermissionData = {
            menuId: 1,
            subjectType: "role",
            subjectId: 2,
            permissions: {
                canView: true,
                canCreate: false,
                canUpdate: false,
                canDelete: false,
            },
        };
        await h.service.changePermissions(change, admin);
        expect(h.repo.setPermissions).toHaveBeenCalledWith(change);
        expect(h.access.setPermission).not.toHaveBeenCalled();
        expect(h.repo.appendAudit).toHaveBeenCalledWith(
            1,
            "permission",
            1,
            { subjectType: "role", subjectId: 2, permissions: null },
            {
                subjectType: "role",
                subjectId: 2,
                permissions: change.permissions,
            },
            null,
        );
    });
    it("an audit failure rejects a menu modification transaction", async () => {
        const h = harness();
        vi.mocked(h.repo.appendAudit).mockRejectedValueOnce(
            new Error("audit failure"),
        );
        let committed = false;
        h.transaction.mockImplementationOnce(async (callback) => {
            const result = await callback(h.executor);
            committed = true;
            return result;
        });
        await expect(h.service.delete(2, admin)).rejects.toThrow(
            "audit failure",
        );
        expect(committed).toBe(false);
    });
});
