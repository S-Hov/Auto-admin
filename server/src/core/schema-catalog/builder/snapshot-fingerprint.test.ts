import { describe, expect, it } from "vitest";
import { createSnapshotFingerprint } from "./snapshot-fingerprint";
import type { DBSnapshot } from "../types/schema-catalog.types";

const snapshot = (scannedAt: Date, tableName = 'orders'): DBSnapshot => ({
    schemaName: 'shop',
    scannedAt,
    tables: [{
        name: tableName,
        type: 'table',
        engine: 'InnoDB',
        columns: [],
        primaryKey: null,
        uniqueKeys: [],
        foreignKeys: [],
        isServiceTable: false,
        comment: null,
        indexes: [],
    }],
});

describe('createSnapshotFingerprint', () => {
    it('does not include scan time in the fingerprint', () => {
        expect(createSnapshotFingerprint(snapshot(new Date('2025-01-01'))))
            .toBe(createSnapshotFingerprint(snapshot(new Date('2026-01-01'))));
    });

    it('changes when schema metadata changes', () => {
        expect(createSnapshotFingerprint(snapshot(new Date(), 'orders')))
            .not.toBe(createSnapshotFingerprint(snapshot(new Date(), 'users')));
    });
});
