import fs from 'node:fs/promises';
import path from 'node:path';
import { type MigrationDescriptor } from "./migration.types";
import { createHash } from 'node:crypto';

export async function loadMigrationCatalog(): Promise<ReadonlyArray<MigrationDescriptor>> {

    const entries = await fs.readdir(path.join(__dirname, 'sql/'), { withFileTypes: true });

    const seenVersions = new Set<string>();
    const seenNames = new Set<string>();
    const validFiles: Array<{
        version: string;
        name: string;
        fileName: string;
    }> = [];

    const migrationRegex = /^(\d{4})__([a-zA-Z0-9_]+)\.sql$/;

    for (const entry of entries) {
        if (!entry.isFile()) continue;

        const file = entry.name;
        if (!file.endsWith('.sql')) continue;

        const match = file.match(migrationRegex);

        if (!match) {
            throw new Error(`Invalid migration file name: ${file}`);
        }

        const [_, version, name] = match;

        if (seenVersions.has(version)) {
            throw new Error(`Duplicate migration version detected: ${version} (File: ${file})`);
        }
        seenVersions.add(version);

        if (seenNames.has(name.toLowerCase())) {
            throw new Error(`Duplicate migration name detected: ${name} (File: ${file})`);
        }
        seenNames.add(name.toLowerCase());

        validFiles.push({ version, name, fileName: file });
    }

    if (validFiles.length === 0) {
        throw new Error('No migration files found');
    }

    validFiles.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));

    const catalog: MigrationDescriptor[] = [];

    for (const file of validFiles) {
        const absolutePath = path.resolve(__dirname, 'sql', file.fileName);
        const sqlBuffer = await fs.readFile(absolutePath);
        const sqlString = sqlBuffer.toString('utf-8');

        if (!sqlString.trim()) {
            throw new Error(`Migration file is empty: ${file.fileName}`);
        }

        const checksum = createHash('sha256').update(sqlBuffer).digest('hex');

        catalog.push({
            version: file.version,
            name: file.name,
            fileName: file.fileName,
            filePath: absolutePath,
            checksum,
            sql: sqlString,
        })
    }

    return catalog;
}