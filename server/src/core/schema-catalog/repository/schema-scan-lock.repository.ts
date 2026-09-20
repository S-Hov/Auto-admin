import type { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { logger } from "../../../shared/logger";
import { SCHEMA_CATALOG_SCAN_LOCK_NAME } from "../schema-catalog.constants";
import { SchemaCatalogScanInProgressError } from "../schema-catalog.errors";

interface LockRow extends RowDataPacket {
    acquired: 0 | 1 | null;
}

interface UnlockRow extends RowDataPacket {
    released: 0 | 1 | null;
}

export const acquireSchemaScanLock = async (
    connection: PoolConnection,
    timeoutSeconds = 0,
): Promise<void> => {
    const [rows] = await connection.query<LockRow[]>(
        'SELECT GET_LOCK(?, ?) AS acquired',
        [SCHEMA_CATALOG_SCAN_LOCK_NAME, timeoutSeconds],
    );

    if (rows[0]?.acquired === 1) return;
    if (rows[0]?.acquired === 0) throw new SchemaCatalogScanInProgressError();
    throw new Error('MySQL could not acquire the schema catalog scan lock');
};

export const releaseSchemaScanLock = async (connection: PoolConnection): Promise<void> => {
    const [rows] = await connection.query<UnlockRow[]>(
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
