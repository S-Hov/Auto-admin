import { DatabaseExecutor } from "../../../db/contracts/executor.interface";
import { logger } from "../../../shared/logger";
import { SCHEMA_CATALOG_SCAN_LOCK_NAME } from "../schema-catalog.constants";
import { SchemaCatalogScanInProgressError } from "../schema-catalog.errors";

interface LockRow {
    acquired: 0 | 1 | null;
}

interface UnlockRow {
    released: 0 | 1 | null;
}

export const acquireSchemaScanLock = async (
    connection: DatabaseExecutor,
    timeoutSeconds = 0,
): Promise<void> => {
    const rows = await connection.queryRows<LockRow>(
        'SELECT GET_LOCK(?, ?) AS acquired',
        [SCHEMA_CATALOG_SCAN_LOCK_NAME, timeoutSeconds],
    );

    if (rows[0]?.acquired === 1) return;
    if (rows[0]?.acquired === 0) throw new SchemaCatalogScanInProgressError();
    throw new Error('MySQL could not acquire the schema catalog scan lock');
};

export const releaseSchemaScanLock = async (connection: DatabaseExecutor): Promise<void> => {
    const rows = await connection.queryRows<UnlockRow>(
        'SELECT RELEASE_LOCK(?) AS released',
        [SCHEMA_CATALOG_SCAN_LOCK_NAME],
    );

    if (rows[0]?.released !== 1) {
        logger.warn(
            { lockName: SCHEMA_CATALOG_SCAN_LOCK_NAME, released: rows[0]?.released ?? null },
            'Schema catalog scan lock was not released normally',
        );
    }
};
