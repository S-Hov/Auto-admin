import { describe, expect, it, vi } from "vitest";
import {
    admin,
    manager,
    repository,
    database,
} from "../../../tests/fixtures/access.fixture";
import { PermissionManagementService } from "./permission-management.service";
import { MySqlAccessControlRepository } from "./providers/mysql/mysql-access-control.repository";
import type { PermissionChange } from "./contracts/permission-management.types";

const change: PermissionChange = {
    subjectType: "role",
    subjectId: 2,
    targetType: "resource",
    targetId: 1,
    action: "read",
    effect: "allow",
};
function harness() {
    const db = database(),
        repo = repository();
    const createRepository = vi.fn(() => repo);
    const service = new PermissionManagementService(db.provider, {
        type: "mysql",
        createRepository,
    });
    return { ...db, repo, createRepository, service };
}
describe("permission management", () => {
    it("changes the rule and appends audit through the same transactional executor", async () => {
        const h = harness();
        await expect(
            h.service.change(change, admin, "request-1"),
        ).resolves.toEqual({ changed: true });
        expect(h.createRepository).toHaveBeenCalledWith(h.executor);
        expect(h.repo.setPermission).toHaveBeenCalledWith(change);
        expect(h.repo.appendAudit).toHaveBeenCalledWith(
            change,
            null,
            1,
            "request-1",
        );
        expect(h.transaction).toHaveBeenCalledOnce();
    });
    it("an audit failure rejects the whole transaction", async () => {
        const h = harness();
        vi.mocked(h.repo.appendAudit).mockRejectedValueOnce(
            new Error("audit failure"),
        );
        let commit = false;
        h.transaction.mockImplementationOnce(async (callback) => {
            const result = await callback(h.executor);
            commit = true;
            return result;
        });
        await expect(h.service.change(change, admin)).rejects.toThrow(
            "audit failure",
        );
        expect(commit).toBe(false);
    });
    it("effect null removes a rule and preserves its previous value in audit", async () => {
        const h = harness();
        vi.mocked(h.repo.getPermissionForUpdate).mockResolvedValueOnce("deny");
        await h.service.change({ ...change, effect: null }, admin);
        expect(h.repo.appendAudit).toHaveBeenCalledWith(
            { ...change, effect: null },
            "deny",
            1,
            null,
        );
    });
    it("does not write or audit a no-op", async () => {
        const h = harness();
        vi.mocked(h.repo.getPermissionForUpdate).mockResolvedValueOnce("allow");
        await expect(h.service.change(change, admin)).resolves.toEqual({
            changed: false,
        });
        expect(h.repo.setPermission).not.toHaveBeenCalled();
        expect(h.repo.appendAudit).not.toHaveBeenCalled();
    });
    it("rejects non-admin and freshly deactivated/demoted admin", async () => {
        const h = harness();
        await expect(h.service.change(change, manager)).rejects.toMatchObject({
            status: 403,
        });
        expect(h.transaction).not.toHaveBeenCalled();
        vi.mocked(h.repo.isActiveSystemAdminForUpdate).mockResolvedValueOnce(
            false,
        );
        await expect(h.service.change(change, admin)).rejects.toMatchObject({
            status: 403,
        });
        expect(h.repo.setPermission).not.toHaveBeenCalled();
    });
    it("rejects service tables, missing subjects, field delete, invalid enums and JSON bypass flags", async () => {
        const h = harness();
        vi.mocked(h.repo.subjectExists).mockResolvedValueOnce(false);
        await expect(h.service.change(change, admin)).rejects.toMatchObject({
            status: 400,
        });
        vi.mocked(h.repo.getTargetForUpdate).mockResolvedValueOnce({
            resourceId: 1,
            resourceState: "present",
            isServiceTable: true,
            tableName: "secret",
            resourceType: "table",
        });
        await expect(h.service.change(change, admin)).rejects.toMatchObject({
            status: 400,
        });
        for (const input of [
            { ...change, targetType: "field", action: "delete" },
            { ...change, subjectType: "anything" },
            { ...change, skipAuthorization: true },
        ]) {
            await expect(h.service.change(input, admin)).rejects.toMatchObject({
                status: 400,
            });
        }
        expect(h.repo.setPermission).not.toHaveBeenCalled();
    });
});

describe("MySQL permission repository", () => {
    it("loads all rule groups using one consistent SQL statement", async () => {
        const queryRows = vi.fn(
            async (_sql: string, _params?: readonly unknown[]) => [
                {
                    source: "role_resource",
                    target_id: 1,
                    action: "read",
                    effect: "allow",
                },
                {
                    source: "user_field",
                    target_id: 4,
                    action: "read",
                    effect: "deny",
                },
            ],
        );
        const repo = new MySqlAccessControlRepository({
            queryRows: queryRows as never,
            execute: vi.fn(),
        });
        expect(
            await repo.getPermissionsForUser({ userId: 9, roleId: 2 }),
        ).toEqual({
            roleResourceRules: [
                { resourceId: 1, action: "read", effect: "allow" },
            ],
            userResourceRules: [],
            roleFieldRules: [],
            userFieldRules: [{ fieldId: 4, action: "read", effect: "deny" }],
        });
        expect(queryRows).toHaveBeenCalledOnce();
        expect(queryRows.mock.calls[0][1]).toEqual([2, 9, 2, 9]);
    });
});
