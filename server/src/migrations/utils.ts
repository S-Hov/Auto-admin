import { RowDataPacket } from "mysql2";
import fs from "fs/promises";
import path from "path";
import { getPool } from "../db";
import { CREATE_MIGRATION_TABLE_KEY, MIGRATIONS_FILES_DIR, MIGRATIONS_TABLE } from "./config";

interface MigrationRow extends RowDataPacket {
    name: string;
    applied_at?: Date;
}

interface TableExistsResult extends RowDataPacket {
    is_present: number;
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
    const [rows] = await getPool().query<TableExistsResult[]>(`
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = DATABASE() AND table_name = ?
        ) AS is_present
    `, [tableName]);

    return rows[0]?.is_present === 1;
};

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

export const getLastMigrationFile = async (): Promise<string> => {
    const files = await getMigrationFiles(true);
    return files[0] || '';
}

export const getMigrationsSteps = async (): Promise<string[]> => {
    let result = [];
    const migrationFiles = await getMigrationFiles();
    if (!await hasMigrationTable()){
        result.push('Создание таблицы миграций');
        const files = migrationFiles;
        result.push(...files);
    } 
    else{
        const appliedMigrations = await getAppliedMigrationNames();
        result = [...migrationFiles].filter(file => !appliedMigrations.has(file));
    }

    return result;
}

export const getFirstMigrationStep = async (): Promise<string> => {
    if (!await hasMigrationTable()){
        return CREATE_MIGRATION_TABLE_KEY;
    }
    else{
        const steps = await getMigrationsSteps();
        return steps[0] || '';
    }
}

export const hasCompletedMigrationsStep = async (step: string): Promise<boolean> => {
    return (await getAppliedMigrationNames()).has(step);
}

export const applyMigrationStep = async (step: string): Promise<void> => {
    if(step === CREATE_MIGRATION_TABLE_KEY){
        if(!await hasMigrationTable()){
            await createMigrationTable();
        }
        else {
            throw new Error('Таблица миграций уже существует');
        }
    }
    else {
        try {
            if (!await hasCompletedMigrationsStep(step)) {
                const migrationFile = (await getMigrationFiles()).find(file => file.startsWith(step));
                if (!migrationFile) {
                    throw new Error(`Шаг ${step} не найден`);
                }
            }
            else {
                throw new Error(`Шаг ${step} уже выполнен`);
            }
        } catch (error) {
            throw new Error(`Ошибка при применении шага ${step}: ${error}`);
        }
    }
}