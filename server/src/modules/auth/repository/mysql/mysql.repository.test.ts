import { describe, expect, it, vi } from "vitest";
import type { DatabaseExecutor } from "../../../../db/contracts/executor.interface";
import { MySqlAuthRepository } from "./mysql.repository";

const createExecutor = () => {
    const queryRows = vi.fn();
    const execute = vi.fn();

    return {
        executor: { queryRows, execute } as unknown as DatabaseExecutor,
        queryRows,
        execute,
    };
};

describe("MySqlAuthRepository", () => {
    it("returns the first user found by username", async () => {
        const { executor, queryRows } = createExecutor();
        const repository = new MySqlAuthRepository(executor);
        const user = {
            id: 1,
            role_id: 2,
            username: "admin",
            password_hash: "hash",
            is_active: true,
        };
        queryRows.mockResolvedValueOnce([user]);

        await expect(repository.getUserByUserName("admin")).resolves.toBe(user);
        expect(queryRows).toHaveBeenCalledWith(
            expect.stringContaining("FROM Auto_Admin__users"),
            ["admin"],
        );
    });

    it("creates a session through execute", async () => {
        const { executor, execute } = createExecutor();
        const repository = new MySqlAuthRepository(executor);
        const expiresAt = new Date("2030-01-01T00:00:00.000Z");
        execute.mockResolvedValueOnce({ affectedRows: 1, insertId: 10 });

        await repository.createSession({
            user_id: 7,
            token_hash: "token-hash",
            expires_at: expiresAt,
            ip_address: "127.0.0.1",
            user_agent: "test-agent",
        });

        expect(execute).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO Auto_Admin__sessions"),
            [7, "token-hash", expiresAt, "127.0.0.1", "test-agent"],
        );
    });

    it("returns the first active session", async () => {
        const { executor, queryRows } = createExecutor();
        const repository = new MySqlAuthRepository(executor);
        const session = {
            sessionId: 3,
            userId: 7,
            username: "admin",
            roleId: 1,
            roleKey: "admin",
            rights: "full" as const,
            expiresAt: new Date("2030-01-01T00:00:00.000Z"),
        };
        queryRows.mockResolvedValueOnce([session]);

        await expect(
            repository.getActiveSessionByTokenHash("token-hash"),
        ).resolves.toBe(session);
        expect(queryRows).toHaveBeenCalledWith(
            expect.stringContaining("FROM Auto_Admin__sessions"),
            ["token-hash"],
        );
    });

    it("normalizes aggregate counters returned by MySQL", async () => {
        const { executor, queryRows } = createExecutor();
        const repository = new MySqlAuthRepository(executor);
        queryRows.mockResolvedValueOnce([
            {
                userCountInWindow: "2",
                ipCountInWindow: 3,
                ipUserCountInWindow: null,
            },
        ]);

        await expect(
            repository.getLoginAttempts("admin", "127.0.0.1", {
                shortWindowSeconds: 900,
                ipWindowSeconds: 3600,
            }),
        ).resolves.toEqual({
            userCountInWindow: 2,
            ipCountInWindow: 3,
            ipUserCountInWindow: 0,
        });

        expect(queryRows).toHaveBeenCalledWith(
            expect.stringContaining("FROM Auto_Admin__login_attempts"),
            [
                "admin",
                900,
                "127.0.0.1",
                3600,
                "127.0.0.1",
                "admin",
                900,
                "127.0.0.1",
                "admin",
                3600,
            ],
        );
    });

    it("returns the inserted login-attempt id", async () => {
        const { executor, execute } = createExecutor();
        const repository = new MySqlAuthRepository(executor);
        execute.mockResolvedValueOnce({ affectedRows: 1, insertId: 42 });

        await expect(
            repository.createLoginAttempt("admin", null),
        ).resolves.toBe(42);
    });

    it("rejects a missing numeric login-attempt id", async () => {
        const { executor, execute } = createExecutor();
        const repository = new MySqlAuthRepository(executor);
        execute.mockResolvedValueOnce({ affectedRows: 1, insertId: null });

        await expect(
            repository.createLoginAttempt("admin", null),
        ).rejects.toThrow("Database did not return a login attempt id");
    });

    it("revokes and deletes records through execute", async () => {
        const { executor, execute } = createExecutor();
        const repository = new MySqlAuthRepository(executor);
        execute.mockResolvedValue({ affectedRows: 1, insertId: null });

        await repository.revokeSessionByTokenHash("token-hash");
        await repository.deleteLoginAttemptById(15);

        expect(execute).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining("UPDATE Auto_Admin__sessions"),
            ["token-hash"],
        );
        expect(execute).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining("DELETE FROM Auto_Admin__login_attempts"),
            [15],
        );
    });

    it("returns the number of removed old login attempts", async () => {
        const { executor, execute } = createExecutor();
        const repository = new MySqlAuthRepository(executor);
        execute.mockResolvedValueOnce({ affectedRows: 8, insertId: null });

        await expect(repository.cleanOldLoginAttempts(30)).resolves.toBe(8);
        expect(execute).toHaveBeenCalledWith(
            expect.stringContaining("INTERVAL ? DAY"),
            [30],
        );
    });
});
