import { RowDataPacket } from "mysql2";
import fs from "fs/promises";
import path from "path";
import { getPool } from "../db";
import { MIGRATIONS_FILES_DIR, MIGRATIONS_TABLE } from "./config";

interface MigrationRow extends RowDataPacket {
    name: string;
    applied_at?: Date;
}

export const hasMigrationTable = async (): Promise<boolean> => {
    return tableExists(MIGRATIONS_TABLE);
}

export const createMigrationTable = async (): Promise<void> => {
    await getPool().query(`
        CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
            name TEXT PRIMARY KEY,
            applied_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `);
}

export const getAppliedMigrationNames = async (): Promise<Set<string>> => {
    const [rows] = await getPool().query<MigrationRow[]>(`
        SELECT name 
        FROM ${MIGRATIONS_TABLE}
        ORDER BY name ASC
    `);
    return new Set(rows.map((row) => row.name));
}

export const tableExists = async (tableName: string): Promise<boolean> => {
    const [rows] = await getPool().query<RowDataPacket[]>(`
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = DATABASE() AND table_name = ?
        ) AS exists
    `, [tableName]);
    return rows[0]?.exists === 1;
}

export const getMigrationTable = async (): Promise<MigrationRow[]> => {
    const [rows] = await getPool().query<MigrationRow[]>(`
        SELECT * FROM ${MIGRATIONS_TABLE}
    `);

    return rows;
}

export const getMigrationFiles = async(reverseSorting: boolean = false): Promise<string[]> => {
    const files = await fs.readdir(path.join(process.cwd(), MIGRATIONS_FILES_DIR))
    const SQLFiles = files.filter(file => file.endsWith('.sql'));

    SQLFiles.sort((a, b) => a.localeCompare(b));

    if (reverseSorting) {
        SQLFiles.reverse();
    }

    return SQLFiles
}

export const GetLastMigrationFile = async (): Promise<string> => {
    const files = await getMigrationFiles(true);
    return files[0] || '';
}