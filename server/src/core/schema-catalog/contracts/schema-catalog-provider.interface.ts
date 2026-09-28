import type { DatabaseConnectionConfig } from "../../../db/contracts/connection.types";
import type { DatabaseType } from "../../../db/contracts/database.types";
import type { DatabaseConnection, DatabaseExecutor } from "../../../db/contracts/executor.interface";
import type { DBSnapshot } from "../types/schema-catalog.types";
import type { SchemaCatalogRepository } from "./schema-catalog-repository.interface";

export interface SchemaCatalogProvider<
    TDatabaseType extends DatabaseType = DatabaseType,
> {
    readonly type: TDatabaseType;

    resolveSchemaName(config: DatabaseConnectionConfig<TDatabaseType>): string;

    introspect(executor: DatabaseExecutor, schemaName: string, scannedAt: Date): Promise<DBSnapshot>;

    createRepository(executor: DatabaseExecutor): SchemaCatalogRepository;

    acquireScanLock(connection: DatabaseConnection, timeoutSeconds?: number): Promise<void>;

    releaseScanLock(connection: DatabaseConnection): Promise<void>
}
