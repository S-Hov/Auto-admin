import { createHash } from "node:crypto";
import type { DBSnapshot } from "../types/schema-catalog.types";

const stableSerialize = (value: unknown): string => {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;

    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
        .join(',')}}`;
};

export const createSnapshotFingerprint = (snapshot: DBSnapshot): string => {
    const canonicalSnapshot = {
        schemaName: snapshot.schemaName,
        tables: snapshot.tables,
    };

    return createHash('sha256')
        .update(stableSerialize(canonicalSnapshot))
        .digest('hex');
};
