import { ResultSetHeader } from "mysql2";
import { DbExecutor } from "../../db";

export const createRunningSchemaScan = async (executor: DbExecutor, schemaName: string, createdBy: number | null): Promise<number> => {
    const [result] = await executor.query<ResultSetHeader>(`
        INSERT INTO Auto_Admin__schema_scans
        (status, schema_name, created_by)
        VALUES (?, ?, ?)
    `, ['running', schemaName, createdBy]);

    return result.insertId;
}

export const markSchemaScanSucceeded = async (executor: DbExecutor, scanId: number, fingerprint: string): Promise<void> => {

}

export const markSchemaScanFailed = async (executor: DbExecutor, scanId: number, errorMessage: string): Promise<void> => {
    await executor.query(`
        UPDATE Auto_Admin__schema_scans
        SET status = 'failed', error_message = ?
        WHERE id = ?
    `, [errorMessage, scanId])
}
