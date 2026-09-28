import { beforeEach, describe, expect, it, vi } from "vitest";

const fakes = vi.hoisted(() => {
    const events: string[] = [];
    const connection = { execute: vi.fn() };
    const repository = {
        ensureMigrationHistoryTable: vi.fn(),
        getMigrationHistory: vi.fn(),
        insertRunningMigration: vi.fn(),
        markMigrationApplied: vi.fn(),
        markMigrationFailed: vi.fn(),
    };
    const provider = {
        createRepository: vi.fn(() => repository),
        loadCatalog: vi.fn(async () => [{
            version: "0001", name: "installation", fileName: "0001__installation.sql",
            filePath: "/test/0001__installation.sql", checksum: "abc",
            sql: "CREATE TABLE example (id INT)",
        }]),
        acquireLock: vi.fn(),
        releaseLock: vi.fn(),
    };
    const databaseProvider = {
        withConnection: vi.fn(async (callback: (value: typeof connection) => Promise<unknown>) =>
            callback(connection)),
    };
    return { events, connection, repository, provider, databaseProvider };
});

vi.mock("../db/runtime/database.runtime", () => ({
    databaseRuntime: {
        getProvider: () => fakes.databaseProvider,
    },
}));
vi.mock("./runtime/migration.runtime", () => ({
    getActiveMigrationProvider: () => fakes.provider,
}));
import { applyNextMigration } from "./migration.runner";

describe("applyNextMigration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fakes.events.length = 0;
        fakes.repository.getMigrationHistory.mockResolvedValue([]);
        fakes.repository.ensureMigrationHistoryTable.mockResolvedValue(undefined);
        fakes.repository.insertRunningMigration.mockImplementation(async () => {
            fakes.events.push("running");
        });
        fakes.repository.markMigrationApplied.mockImplementation(async () => {
            fakes.events.push("applied");
        });
        fakes.repository.markMigrationFailed.mockImplementation(async () => {
            fakes.events.push("failed");
        });
        fakes.connection.execute.mockImplementation(async () => {
            fakes.events.push("sql");
        });
    });

    it("runs SQL and history updates on one locked connection", async () => {
        const result = await applyNextMigration("0001");

        expect(result.isComplete).toBe(true);
        expect(result.applied?.version).toBe("0001");
        expect(fakes.provider.acquireLock).toHaveBeenCalledWith(fakes.connection);
        expect(fakes.provider.createRepository).toHaveBeenCalledWith(fakes.connection);
        expect(fakes.events).toEqual(["running", "sql", "applied"]);
        expect(fakes.connection.execute).toHaveBeenCalledWith(
            "CREATE TABLE example (id INT)", undefined, { timeoutMs: null },
        );
        expect(fakes.provider.releaseLock).toHaveBeenCalledWith(fakes.connection);
    });

    it("records failed SQL and releases the lock", async () => {
        const sqlError = new Error("DDL failed");
        fakes.connection.execute.mockRejectedValueOnce(sqlError);

        await expect(applyNextMigration("0001")).rejects.toBe(sqlError);
        expect(fakes.events).toEqual(["running", "failed"]);
        expect(fakes.repository.markMigrationFailed).toHaveBeenCalledWith(
            "0001", expect.any(Number), "DDL failed",
        );
        expect(fakes.provider.releaseLock).toHaveBeenCalledWith(fakes.connection);
    });
});
