import type { PoolConnection, RowDataPacket } from "mysql2/promise"
import { MIGRATION_LOCK_NAME } from "./config";

interface MigrationLockRow extends RowDataPacket {
    acquired: 0 | 1 | null;
}

interface MigrationUnlockRow extends RowDataPacket {
    released: 0 | 1 | null;
}

export const acquireMigrationLock = async (connection: PoolConnection, timeoutSeconds = 0): Promise<void> => {
    const [rows] = await connection.query<MigrationLockRow[]>(`
        SELECT GET_LOCK(?, ?) AS acquired
    `, [MIGRATION_LOCK_NAME, timeoutSeconds]);
    const acquired = rows[0]?.acquired;

    if (acquired === 1) return;
    else if (acquired === 0) throw new Error('Миграции уже выполняются');
    else throw new Error('Ошибка при получении блокировки миграций');
}

export const releaseMigrationLock = async (connection: PoolConnection): Promise<void> => {
    const [rows] = await connection.query<MigrationUnlockRow[]>(`
        SELECT RELEASE_LOCK(?) AS released
    `, [MIGRATION_LOCK_NAME]);

    const released = rows[0]?.released;

    if (released === 1) return;
    else if (released === 0) throw new Error('Блокировка существует, но принадлежит другому соединению');
    else throw new Error('Блокировки с таким именем не существует');
}