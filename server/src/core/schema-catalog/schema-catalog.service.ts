import type { DatabaseProvider } from "../../db/contracts/provider.interface";
import { databaseRuntime } from "../../db/runtime/database.runtime";
import { logger } from "../../shared/logger";
import { createSnapshotFingerprint } from "./builder/snapshot-fingerprint";
import {
    schemaCatalogCache,
    type CachedSchemaCatalog,
    type SchemaCatalogCache,
    createReadonlyCatalog,
} from "./cache/schema-catalog.cache";
import type { SchemaCatalogProvider } from "./contracts/schema-catalog-provider.interface";
import { getActiveSchemaCatalogProvider } from "./runtime/schema-catalog.runtime";
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
        private readonly configuredDatabaseProvider?: DatabaseProvider,
        private readonly configuredSchemaCatalogProvider?: SchemaCatalogProvider,
        private readonly cache: SchemaCatalogCache = schemaCatalogCache,
        private readonly configuredSchemaName?: string,
    ) {}

    private resolveProviders(): {
        databaseProvider: DatabaseProvider;
        schemaCatalogProvider: SchemaCatalogProvider;
    } {
        return {
            databaseProvider:
                this.configuredDatabaseProvider ??
                databaseRuntime.getProvider(),
            schemaCatalogProvider:
                this.configuredSchemaCatalogProvider ??
                getActiveSchemaCatalogProvider(),
        };
    }

    private resolveSchemaName(
        databaseProvider: DatabaseProvider,
        schemaCatalogProvider: SchemaCatalogProvider,
    ): string {
        if (this.configuredSchemaName) return this.configuredSchemaName;

        return schemaCatalogProvider.resolveSchemaName(
            databaseProvider.getConnectionConfig(),
        );
    }

    async getCatalog(): Promise<CachedSchemaCatalog> {
        const { databaseProvider, schemaCatalogProvider } =
            this.resolveProviders();
        const schemaName = this.resolveSchemaName(
            databaseProvider,
            schemaCatalogProvider,
        );
        const repository =
            schemaCatalogProvider.createRepository(databaseProvider);

        return this.cache.getOrLoad(async () => {
            const catalog = await repository.readPersistedCatalog(schemaName);
            if (!catalog) throw new SchemaCatalogNotReadyError();
            return catalog;
        });
    }

    async refreshCache(): Promise<CachedSchemaCatalog> {
        const { databaseProvider, schemaCatalogProvider } =
            this.resolveProviders();
        const schemaName = this.resolveSchemaName(
            databaseProvider,
            schemaCatalogProvider,
        );
        const repository =
            schemaCatalogProvider.createRepository(databaseProvider);
        const catalog = await repository.readPersistedCatalog(schemaName);

        if (!catalog) throw new SchemaCatalogNotReadyError();
        return this.cache.replace(catalog);
    }

    /** A consistent persisted snapshot for authorization, including scans made by other processes. */
    async getAuthorizationCatalog(): Promise<CachedSchemaCatalog> {
        const { databaseProvider, schemaCatalogProvider } =
            this.resolveProviders();
        const schemaName = this.resolveSchemaName(
            databaseProvider,
            schemaCatalogProvider,
        );
        const catalog = await databaseProvider.transaction(async (executor) => {
            const result = await schemaCatalogProvider
                .createRepository(executor)
                .readPersistedCatalog(schemaName);
            if (!result) throw new SchemaCatalogNotReadyError();
            return result;
        });
        return createReadonlyCatalog(catalog);
    }

    clearCache(): void {
        this.cache.clear();
    }

    async scan(createdBy: number | null = null): Promise<SchemaScanResult> {
        const { databaseProvider, schemaCatalogProvider } =
            this.resolveProviders();
        const schemaName = this.resolveSchemaName(
            databaseProvider,
            schemaCatalogProvider,
        );

        return databaseProvider.withConnection(async (connection) => {
            const connectionRepository =
                schemaCatalogProvider.createRepository(connection);
            let lockAcquired = false;
            let scanSucceeded = false;
            let scanId: number | null = null;

            try {
                await schemaCatalogProvider.acquireScanLock(connection);
                lockAcquired = true;

                const runningScanId =
                    await connectionRepository.createRunningScan(
                        schemaName,
                        createdBy,
                    );
                scanId = runningScanId;

                const snapshot = await schemaCatalogProvider.introspect(
                    connection,
                    schemaName,
                    new Date(),
                );
                const fingerprint = createSnapshotFingerprint(snapshot);

                const { counts, catalog } = await connection.transaction(
                    async (executor) => {
                        const repository =
                            schemaCatalogProvider.createRepository(executor);
                        const counts = await synchronizeSchemaCatalog(
                            repository,
                            snapshot,
                            runningScanId,
                        );
                        const catalog = await repository.readPersistedCatalog(
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
                        await schemaCatalogProvider.releaseScanLock(connection);
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
