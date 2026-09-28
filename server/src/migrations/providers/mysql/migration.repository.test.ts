import { describe, expect, it, vi } from "vitest";
import type { DatabaseExecutor } from "../../../db/contracts/executor.interface";
import { MySqlMigrationHistoryRepository } from "./migration.repository";

describe("MySqlMigrationHistoryRepository", () => {
    const makeRepository = () => {
        const execute = vi.fn();
        const queryRows = vi.fn();
        const repository = new MySqlMigrationHistoryRepository(
            { execute, queryRows } as unknown as DatabaseExecutor,
        );
        return { repository, execute, queryRows };
    };

    it("maps database history rows to migration records", async () => {
        const { repository, queryRows } = makeRepository();
        const startedAt = new Date("2026-01-01T00:00:00Z");
        queryRows.mockResolvedValueOnce([{
            version: "0001", name: "installation", file_name: "0001__installation.sql",
            checksum: "abc", status: "applied", started_at: startedAt,
            finished_at: startedAt, execution_ms: 15, error_message: null,
            attempt_count: 1, app_version: null, updated_at: startedAt,
        }]);

        await expect(repository.getMigrationHistory()).resolves.toEqual([{
            version: "0001", name: "installation", fileName: "0001__installation.sql",
            checksum: "abc", status: "applied", startedAt,
            finishedAt: startedAt, executionMs: 15, errorMessage: null,
            attemptCount: 1, appVersion: null, updatedAt: startedAt,
        }]);
    });

    it("requires one running row before marking a migration applied", async () => {
        const { repository, execute } = makeRepository();
        execute.mockResolvedValueOnce({ affectedRows: 0, insertId: null });

        await expect(repository.markMigrationApplied("0001", 15))
            .rejects.toThrow("not found or not in running state");
    });

    it("requires a positive recovery audit id", async () => {
        const { repository, execute } = makeRepository();
        execute.mockResolvedValueOnce({ affectedRows: 1, insertId: null });

        await expect(repository.startMigrationRecoveryEvent("0001", "retry", {
            ipAddress: null, userAgent: null, requestId: null,
        })).rejects.toThrow("did not return a recovery event id");
    });
});
