import { describe, expect, it, vi } from "vitest";
import type { DatabaseConnection } from "../../../db/contracts/executor.interface";
import { MIGRATION_LOCK_NAME } from "../../config";
import { MigrationLockUnavailableError } from "../../migration.errors";
import { MySqlMigrationProvider } from "./mysql-migration.provider";

describe("MySqlMigrationProvider migration lock", () => {
    const makeConnection = (rows: unknown[]) => {
        const queryRows = vi.fn().mockResolvedValue(rows);
        const discard = vi.fn();
        return {
            connection: { queryRows, discard } as unknown as DatabaseConnection,
            queryRows,
            discard,
        };
    };

    it("loads only the MySQL migration catalog from its own directory", async () => {
        const catalog = await new MySqlMigrationProvider().loadCatalog();

        expect(catalog.length).toBeGreaterThan(0);
        expect(catalog[0]?.version).toBe("0001");
        expect(catalog.every((migration) =>
            migration.filePath.replaceAll("\\", "/").includes("/migrations/providers/mysql/sql/"),
        )).toBe(true);
    });

    it("acquires and releases the lock on the supplied connection", async () => {
        const { connection, queryRows } = makeConnection([{ acquired: 1 }]);
        const provider = new MySqlMigrationProvider();

        await provider.acquireLock(connection);
        queryRows.mockResolvedValueOnce([{ released: 1 }]);
        await provider.releaseLock(connection);

        expect(queryRows).toHaveBeenNthCalledWith(
            1,
            "SELECT GET_LOCK(?, ?) AS acquired",
            [MIGRATION_LOCK_NAME, 0],
        );
        expect(queryRows).toHaveBeenNthCalledWith(
            2,
            "SELECT RELEASE_LOCK(?) AS released",
            [MIGRATION_LOCK_NAME],
        );
    });

    it("rejects a lock already held by another connection", async () => {
        const { connection } = makeConnection([{ acquired: 0 }]);
        await expect(new MySqlMigrationProvider().acquireLock(connection))
            .rejects.toBeInstanceOf(MigrationLockUnavailableError);
    });

    it("discards a connection if the lock cannot be confirmed released", async () => {
        const { connection, discard } = makeConnection([{ released: 0 }]);

        await expect(new MySqlMigrationProvider().releaseLock(connection))
            .rejects.toThrow("Migration lock was not released normally");
        expect(discard).toHaveBeenCalledOnce();
    });

    it("discards a connection when the unlock query fails", async () => {
        const { connection, queryRows, discard } = makeConnection([]);
        const error = new Error("connection lost");
        queryRows.mockRejectedValueOnce(error);

        await expect(new MySqlMigrationProvider().releaseLock(connection)).rejects.toBe(error);
        expect(discard).toHaveBeenCalledOnce();
    });
});
