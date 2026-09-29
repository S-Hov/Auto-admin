import path from "node:path";
import type { DatabaseConnection, DatabaseExecutor } from "../../../db/contracts/executor.interface";
import { loadMigrationCatalog } from "../../migration.catalog";
import { MIGRATION_LOCK_NAME } from "../../config";
import type { MigrationProvider } from "../../contracts/migration-provider.interface";
import type { MigrationHistoryRepository } from "../../contracts/migrations.interface";
import { MigrationLockUnavailableError } from "../../migration.errors";
import type { MigrationDescriptor } from "../../migration.types";
import { MySqlMigrationHistoryRepository } from "./migration.repository";
import { verifyMigrationApplied } from "./migration.verification";

interface LockRow { acquired: 0 | 1 | null; }
interface UnlockRow { released: 0 | 1 | null; }

export class MySqlMigrationProvider implements MigrationProvider<"mysql"> {
    readonly type = "mysql";

    createRepository(executor: DatabaseExecutor): MigrationHistoryRepository {
        return new MySqlMigrationHistoryRepository(executor);
    }

    loadCatalog(): Promise<ReadonlyArray<MigrationDescriptor>> {
        return loadMigrationCatalog(path.join(__dirname, "sql"));
    }

    async acquireLock(connection: DatabaseConnection, timeoutSeconds = 0): Promise<void> {
        const rows = await connection.queryRows<LockRow>(
            "SELECT GET_LOCK(?, ?) AS acquired",
            [MIGRATION_LOCK_NAME, timeoutSeconds],
        );
        if (rows[0]?.acquired === 1) return;
        if (rows[0]?.acquired === 0) throw new MigrationLockUnavailableError();
        throw new Error("Failed to acquire migration lock");
    }

    async releaseLock(connection: DatabaseConnection): Promise<void> {
        try {
            const rows = await connection.queryRows<UnlockRow>(
                "SELECT RELEASE_LOCK(?) AS released",
                [MIGRATION_LOCK_NAME],
            );
            if (rows[0]?.released === 1) return;
            throw new Error("Migration lock was not released normally");
        } catch (error) {
            // A pooled connection may retain a named lock until its session ends.
            connection.discard();
            throw error;
        }
    }

    verifyApplied(executor: DatabaseExecutor, version: string): Promise<boolean> {
        return verifyMigrationApplied(executor, version);
    }
}

export const mysqlMigrationProvider = new MySqlMigrationProvider();
