import fs from "fs/promises";
import path from "path";

export async function getSortedMigrations() {

    const rawFiles = await fs.readdir(path.join(__dirname, 'sql/'));

    const seenVersions = new Set();
    const seenNames = new Set();
    const validFiles = [];

    const migrationRegex = /^(\d{4})__([a-zA-Z0-9_]+)\.sql$/;

    for (const file of rawFiles) {
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

        if (seenNames.has(name)) {
            throw new Error(`Duplicate migration name detected: ${name} (File: ${file})`);
        }
        seenNames.add(name);

        validFiles.push(file);
    }

    return validFiles.sort((a, b) => a.localeCompare(b));
}