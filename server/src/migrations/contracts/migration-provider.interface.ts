import type { DatabaseConnection, DatabaseExecutor } from "../../db/contracts/executor.interface";
import type { DatabaseType } from "../../db/contracts/database.types";
import type { MigrationHistoryRepository } from "./migrations.interface";

export interface MigrationProvider<TDatabaseType extends DatabaseType = DatabaseType> {
    readonly type: TDatabaseType;
    createRepository(executor: DatabaseExecutor): MigrationHistoryRepository;
    acquireLock(connection: DatabaseConnection, timeoutSeconds?: number): Promise<void>;
    releaseLock(connection: DatabaseConnection): Promise<void>;
    verifyApplied(executor: DatabaseExecutor, version: string): Promise<boolean>;
}
