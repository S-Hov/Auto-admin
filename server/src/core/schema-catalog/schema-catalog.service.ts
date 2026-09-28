import type { DatabaseProvider } from "../../db/contracts/provider.interface";
import { activeDatabaseProvider } from "../../db/runtime/database.runtime";
import { logger } from "../../shared/logger";
import { createSnapshotFingerprint } from "./builder/snapshot-fingerprint";
import {
    schemaCatalogCache,
    type CachedSchemaCatalog,
    type SchemaCatalogCache,
} from "./cache/schema-catalog.cache";
import type { SchemaCatalogProvider } from "./contracts/schema-catalog-provider.interface";
import { activeSchemaCatalogProvider } from "./runtime/schema-catalog.runtime";
import {
    SchemaCatalogError,
    SchemaCatalogNotReadyError,
} from "./schema-catalog.errors";
import { synchronizeSchemaCatalog } from "./synchronizer/schema-catalog.synchronizer";
import type { SchemaScanResult } from "./types/schema-catalog.types";

const errorCodeForScan = (error: unknown): string => {
    if (error instanceof SchemaCatalogError) return error.code;
    if (
        error instanceof Error &&
        "code" in error &&
        typeof error.code === "string"
    ) {
        return error.code;
    }
    return "SCHEMA.SCAN_FAILED";
};

export class SchemaCatalogService {
    constructor(
        private readonly databaseProvider: DatabaseProvider =
            activeDatabaseProvider,
        private readonly schemaCatalogProvider: SchemaCatalogProvider =
            activeSchemaCatalogProvider,
        private readonly cache: SchemaCatalogCache = schemaCatalogCache,
        private readonly configuredSchemaName?: string,
    ) {}

    private resolveSchemaName(): string {
        if (this.configuredSchemaName) return this.configuredSchemaName;

        return this.schemaCatalogProvider.resolveSchemaName(
            this.databaseProvider.getConnectionConfig(),
        );
    }

    async getCatalog(): Promise<CachedSchemaCatalog> {
        const schemaName = this.resolveSchemaName();
        const repository = this.schemaCatalogProvider.createRepository(
            this.databaseProvider,
        );

        return this.cache.getOrLoad(async () => {
            const catalog = await repository.readPersistedCatalog(schemaName);
            if (!catalog) throw new SchemaCatalogNotReadyError();
            return catalog;
        });
    }

    async refreshCache(): Promise<CachedSchemaCatalog> {
        const schemaName = this.resolveSchemaName();
        const repository = this.schemaCatalogProvider.createRepository(
            this.databaseProvider,
        );
        const catalog = await repository.readPersistedCatalog(schemaName);

        if (!catalog) throw new SchemaCatalogNotReadyError();
        return this.cache.replace(catalog);
    }

    clearCache(): void {
        this.cache.clear();
    }

    async scan(createdBy: number | null = null): Promise<SchemaScanResult> {
        const schemaName = this.resolveSchemaName();

        return this.databaseProvider.withConnection(async (connection) => {
            const connectionRepository =
                this.schemaCatalogProvider.createRepository(connection);
            let lockAcquired = false;
            let scanSucceeded = false;
            let scanId: number | null = null;

            try {
                await this.schemaCatalogProvider.acquireScanLock(connection);
                lockAcquired = true;

                const runningScanId =
                    await connectionRepository.createRunningScan(
                    schemaName,
                    createdBy,
                );
                scanId = runningScanId;

                const snapshot = await this.schemaCatalogProvider.introspect(
                    connection,
                    schemaName,
                    new Date(),
                );
                const fingerprint = createSnapshotFingerprint(snapshot);

                const { counts, catalog } = await connection.transaction(
                    async (executor) => {
                        const repository =
                            this.schemaCatalogProvider.createRepository(
                                executor,
                            );
                        const counts = await synchronizeSchemaCatalog(
                            repository,
                            snapshot,
                            runningScanId,
                        );
                        const catalog =
                            await repository.readPersistedCatalog(
                                schemaName,
                                fingerprint,
                            );

                        if (!catalog) {
                            throw new Error(
                                "Synchronized schema catalog could not be loaded",
                            );
                        }

                        await repository.markScanSucceeded(
                            runningScanId,
                            fingerprint,
                            counts,
                        );

                        return { counts, catalog };
                    },
                );

                scanSucceeded = true;
                this.cache.replace(catalog);

                return { scanId: runningScanId, fingerprint, counts, catalog };
            } catch (error) {
                if (scanId !== null && !scanSucceeded) {
                    try {
                        await connectionRepository.markScanFailed(
                            scanId,
                            errorCodeForScan(error),
                        );
                    } catch (markFailedError) {
                        logger.error(
                            { markFailedError, scanId },
                            "Failed to mark schema catalog scan as failed",
                        );
                    }
                }

                throw error;
            } finally {
                if (lockAcquired) {
                    try {
                        await this.schemaCatalogProvider.releaseScanLock(
                            connection,
                        );
                    } catch (releaseError) {
                        logger.error(
                            { releaseError },
                            "Failed to release schema catalog scan lock",
                        );
                    }
                }
            }
        });
    }
}

export const schemaCatalogService = new SchemaCatalogService();
