import { describe, it, expect, vi } from "vitest";
import {
    admin,
    manager,
    database,
    repository,
} from "../../../tests/fixtures/access.fixture";
import { MenuService } from "./menu.service";
import type { MenuItem, MenuVisibilityRow } from "./menu.types";
import type { MenuRepository } from "./repository/menu-repository.interface";

const item = (id: number, parentId: number | null = null): MenuItem => ({
    id,
    parentId,
    name: `Menu ${id}`,
    slug: `menu-${id}`,
    icon: null,
    iconType: "icon",
    sortOrder: id,
    isActive: true,
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
    const service = new MenuService(
        db.provider,
        { type: "mysql", createRepository: () => access },
        () => repo,
    );
    return { ...db, access, repo, service };
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
    it("rejects raw SVG, unsafe schemes and unknown payload fields", async () => {
        const h = harness();
        for (const input of [
            { ...item(1), iconType: "svg", icon: "<svg onload='alert(1)'/>" },
            { ...item(1), iconType: "image", icon: "javascript:alert(1)" },
            { ...item(1), iconType: "image", icon: "/assets/../secret.svg" },
            { ...item(1), canManageEverything: true },
        ])
            await expect(h.service.save(input, admin)).rejects.toMatchObject({
                status: 400,
            });
        expect(h.repo.save).not.toHaveBeenCalled();
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
        const change = {
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
