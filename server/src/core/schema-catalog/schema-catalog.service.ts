import type { Pool } from "mysql2/promise";
import { getEnvConnectionParams, getPool } from "../../db";
import { logger } from "../../shared/logger";
import { createSnapshotFingerprint } from "./builder/snapshot-fingerprint";
import { schemaSnapshotBuilder } from "./builder/schema-snapshot.builder";
import {
    schemaCatalogCache,
    type CachedSchemaCatalog,
    type SchemaCatalogCache,
} from "./cache/schema-catalog.cache";
import { readInformationSchemaRows } from "./introspection/mysql-schema-introspector";
import { readPersistedSchemaCatalog } from "./repository/persisted-catalog.repository";
import { acquireSchemaScanLock, releaseSchemaScanLock } from "./repository/schema-scan-lock.repository";
import {
    createRunningSchemaScan,
    markSchemaScanFailed,
    markSchemaScanSucceeded,
} from "./repository/schema-scan.repository";
import { SchemaCatalogError, SchemaCatalogNotReadyError } from "./schema-catalog.errors";
import { synchronizeSchemaCatalog } from "./synchronizer/schema-catalog.synchronizer";
import type { SchemaScanResult } from "./types/schema-catalog.types";

const errorCodeForScan = (error: unknown): string => {
    if (error instanceof SchemaCatalogError) return error.code;
    if (error instanceof Error && 'code' in error && typeof error.code === 'string') return error.code;
    return 'SCHEMA.SCAN_FAILED';
};

export class SchemaCatalogService {
    constructor(
        private readonly configuredPool?: Pool,
        private readonly configuredSchemaName?: string,
        private readonly cache: SchemaCatalogCache = schemaCatalogCache,
    ) {}

    private resolvePool(): Pool {
        return this.configuredPool ?? getPool();
    }

    private resolveSchemaName(): string {
        return this.configuredSchemaName ?? getEnvConnectionParams().database;
    }

    async getCatalog(): Promise<CachedSchemaCatalog> {
        const pool = this.resolvePool();
        const schemaName = this.resolveSchemaName();
        return this.cache.getOrLoad(async () => {
            const catalog = await readPersistedSchemaCatalog(pool, schemaName);
            if (!catalog) throw new SchemaCatalogNotReadyError();
            return catalog;
        });
    }

    async refreshCache(): Promise<CachedSchemaCatalog> {
        const catalog = await readPersistedSchemaCatalog(this.resolvePool(), this.resolveSchemaName());
        if (!catalog) throw new SchemaCatalogNotReadyError();
        return this.cache.replace(catalog);
    }

    clearCache(): void {
        this.cache.clear();
    }

    async scan(createdBy: number | null = null): Promise<SchemaScanResult> {
        const pool = this.resolvePool();
        const schemaName = this.resolveSchemaName();
        const connection = await pool.getConnection();
        let lockAcquired = false;
        let transactionOpen = false;
        let committed = false;
        let scanId: number | null = null;

        try {
            await acquireSchemaScanLock(connection);
            lockAcquired = true;
            scanId = await createRunningSchemaScan(connection, schemaName, createdBy);

            const informationSchemaRows = await readInformationSchemaRows(connection, schemaName);
            const snapshot = schemaSnapshotBuilder(schemaName, new Date(), informationSchemaRows);
            const fingerprint = createSnapshotFingerprint(snapshot);

            await connection.beginTransaction();
            transactionOpen = true;

            const counts = await synchronizeSchemaCatalog(connection, snapshot, scanId);
            const catalog = await readPersistedSchemaCatalog(connection, schemaName, fingerprint);
            if (!catalog) throw new Error('Synchronized schema catalog could not be loaded');

            await markSchemaScanSucceeded(connection, scanId, fingerprint, counts);
            await connection.commit();
            transactionOpen = false;
            committed = true;

            this.cache.replace(catalog);

            return { scanId, fingerprint, counts, catalog };
        } catch (error) {
            if (transactionOpen) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    logger.error({ rollbackError, scanId }, 'Failed to roll back schema catalog scan');
                }
            }

            if (scanId !== null && !committed) {
                try {
                    await markSchemaScanFailed(connection, scanId, errorCodeForScan(error));
                } catch (markFailedError) {
                    logger.error({ markFailedError, scanId }, 'Failed to mark schema catalog scan as failed');
                }
            }

            throw error;
        } finally {
            if (lockAcquired) {
                try {
                    await releaseSchemaScanLock(connection);
                } catch (releaseError) {
                    logger.error({ releaseError }, 'Failed to release schema catalog scan lock');
                }
            }
            connection.release();
        }
    }
}

export const schemaCatalogService = new SchemaCatalogService();
