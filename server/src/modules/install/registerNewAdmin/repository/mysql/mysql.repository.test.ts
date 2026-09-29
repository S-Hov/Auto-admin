import { describe, expect, it, vi } from "vitest";
import type { DatabaseExecutor } from "../../../../../db/contracts/executor.interface";
import type {
    AdminLookupRow,
    RequestMeta,
    UserRole,
} from "../../register.types";
import { MySqlRegisterAdminRepository } from "./mysql.repository";

const createExecutor = () => {
    const queryRows = vi.fn();
    const execute = vi.fn();

    return {
        executor: { queryRows, execute } as unknown as DatabaseExecutor,
        queryRows,
        execute,
    };
};

describe("MySqlRegisterAdminRepository", () => {
    it("getRoleByKey возвращает первую найденную роль", async () => {
        const { executor, queryRows } = createExecutor();
        const repository = new MySqlRegisterAdminRepository(executor);
        const role1: UserRole = {
            id: 1,
            key: "admin",
            name: "Administrator",
            rights: "full",
        };
        const role2: UserRole = {
            id: 2,
            key: "admin_duplicate",
            name: "Admin Duplicate",
            rights: "full",
        };
        queryRows.mockResolvedValueOnce([role1, role2]);

        const result = await repository.getRoleByKey("admin");

        expect(result).toBe(role1);
    });

    it("Возвращает undefined, если роль не найдена", async () => {
        const { executor, queryRows } = createExecutor();
        const repository = new MySqlRegisterAdminRepository(executor);
        queryRows.mockResolvedValueOnce([]);

        const result = await repository.getRoleByKey("unknown");

        expect(result).toBeUndefined();
    });

    it("Передаёт правильный ключ роли в SQL-параметры", async () => {
        const { executor, queryRows } = createExecutor();
        const repository = new MySqlRegisterAdminRepository(executor);
        const role: UserRole = {
            id: 1,
            key: "admin",
            name: "Administrator",
            rights: "full",
        };
        queryRows.mockResolvedValueOnce([role]);

        await repository.getRoleByKey("admin");

        expect(queryRows).toHaveBeenCalledWith(
            expect.stringContaining("Auto_Admin__roles"),
            ["admin"],
        );
    });

    it("getAdminByRoleId возвращает администратора", async () => {
        const { executor, queryRows } = createExecutor();
        const repository = new MySqlRegisterAdminRepository(executor);
        const admin: AdminLookupRow = { id: 5, username: "superadmin" };
        queryRows.mockResolvedValueOnce([admin]);

        const result = await repository.getAdminByRoleId(1);

        expect(result).toBe(admin);
        expect(queryRows).toHaveBeenCalledWith(
            expect.stringContaining("Auto_Admin__users"),
            [1],
        );
    });

    it("Возвращает undefined, если администратора нет", async () => {
        const { executor, queryRows } = createExecutor();
        const repository = new MySqlRegisterAdminRepository(executor);
        queryRows.mockResolvedValueOnce([]);

        const result = await repository.getAdminByRoleId(999);

        expect(result).toBeUndefined();
    });

    it("register вызывает execute с roleId, нормализованным именем и хешем", async () => {
        const { executor, execute } = createExecutor();
        const repository = new MySqlRegisterAdminRepository(executor);
        execute.mockResolvedValueOnce({ affectedRows: 1, insertId: 10 });

        await repository.register(1, "admin", "hash123");

        expect(execute).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO Auto_Admin__users"),
            [1, "admin", "hash123"],
        );
    });

    it("register возвращает числовой insertId", async () => {
        const { executor, execute } = createExecutor();
        const repository = new MySqlRegisterAdminRepository(executor);
        execute.mockResolvedValueOnce({ affectedRows: 1, insertId: 42 });

        const insertId = await repository.register(1, "admin", "hash123");

        expect(insertId).toBe(42);
    });

    it("register выбрасывает ошибку, если insertId равен null или имеет неправильный тип", async () => {
        const { executor, execute } = createExecutor();
        const repository = new MySqlRegisterAdminRepository(executor);

        execute.mockResolvedValueOnce({ affectedRows: 1, insertId: null });
        await expect(
            repository.register(1, "admin", "hash123"),
        ).rejects.toThrow("Failed to get insert ID");

        execute.mockResolvedValueOnce({
            affectedRows: 1,
            insertId: "42" as unknown as number,
        });
        await expect(
            repository.register(1, "admin", "hash123"),
        ).rejects.toThrow("Failed to get insert ID");

        execute.mockResolvedValueOnce({
            affectedRows: 1,
            insertId: undefined as unknown as number,
        });
        await expect(
            repository.register(1, "admin", "hash123"),
        ).rejects.toThrow("Failed to get insert ID");
    });

    it("registerLogger передаёт userId, IP, User-Agent и событие register_success", async () => {
        const { executor, execute } = createExecutor();
        const repository = new MySqlRegisterAdminRepository(executor);
        execute.mockResolvedValueOnce({ affectedRows: 1, insertId: 1 });

        const meta: RequestMeta = {
            ipAddress: "192.168.1.100",
            userAgent: "Vitest/1.0",
        };

        await repository.registerLogger(meta, 7);

        expect(execute).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO Auto_Admin__auth_logs"),
            [7, "register_success", "192.168.1.100", "Vitest/1.0"],
        );
    });
});
