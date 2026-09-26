import type { MySqlDatabaseConnectionConfig } from "../../../../db/contracts/connection.types";
import type {
    DatabaseConnection,
    DatabaseExecutor,
} from "../../../../db/contracts/executor.interface";
import { logger } from "../../../../shared/logger";
import type { SchemaCatalogProvider } from "../../contracts/schema-catalog-provider.interface";
import type { SchemaCatalogRepository } from "../../contracts/schema-catalog-repository.interface";
import { SCHEMA_CATALOG_SCAN_LOCK_NAME } from "../../schema-catalog.constants";
import { SchemaCatalogScanInProgressError } from "../../schema-catalog.errors";
import type { DBSnapshot } from "../../types/schema-catalog.types";
import { MySqlSchemaCatalogRepository } from "./mysql-schema-catalog.repository";
import { readInformationSchemaRows } from "./mysql-schema.introspector";
import { schemaSnapshotBuilder } from "./mysql-schema-snapshot.builder";

interface LockRow {
    acquired: 0 | 1 | null;
}

interface UnlockRow {
    released: 0 | 1 | null;
}

export class MySqlSchemaCatalogProvider implements SchemaCatalogProvider<"mysql"> {
    readonly type = "mysql";

    resolveSchemaName(config: MySqlDatabaseConnectionConfig): string {
        return config.database;
    }

    async introspect(
        executor: DatabaseExecutor,
        schemaName: string,
        scannedAt: Date,
    ): Promise<DBSnapshot> {
        const rows = await readInformationSchemaRows(executor, schemaName);
        return schemaSnapshotBuilder(schemaName, scannedAt, rows);
    }

    createRepository(executor: DatabaseExecutor): SchemaCatalogRepository {
        return new MySqlSchemaCatalogRepository(executor);
    }

    async acquireScanLock(
        connection: DatabaseConnection,
        timeoutSeconds = 0,
    ): Promise<void> {
        const rows = await connection.queryRows<LockRow>(
            "SELECT GET_LOCK(?, ?) AS acquired",
            [SCHEMA_CATALOG_SCAN_LOCK_NAME, timeoutSeconds],
        );

        if (rows[0]?.acquired === 1) return;
        if (rows[0]?.acquired === 0)
            throw new SchemaCatalogScanInProgressError();
        throw new Error("MySQL could not acquire the schema catalog scan lock");
    }

    async releaseScanLock(connection: DatabaseConnection): Promise<void> {
        const rows = await connection.queryRows<UnlockRow>(
            "SELECT RELEASE_LOCK(?) AS released",
            [SCHEMA_CATALOG_SCAN_LOCK_NAME],
        );

        if (rows[0]?.released !== 1) {
            logger.warn(
                {
                    lockName: SCHEMA_CATALOG_SCAN_LOCK_NAME,
                    released: rows[0]?.released ?? null,
                },
                "Schema catalog scan lock was not released normally",
            );
        }
    }
}

export const mysqlSchemaCatalogProvider = new MySqlSchemaCatalogProvider();
