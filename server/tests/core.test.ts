import { z } from 'zod';
import { expect, it } from 'vitest';
import { buildMigrationPlan } from '../src/migrations/migration.plan';
import { MigrationRecoveryRequiredError } from '../src/migrations/migration.errors';
import type { MigrationDescriptor, MigrationHistoryRecord } from '../src/migrations/migration.types';
import { mapZodIssue } from '../src/shared/api/validation/map-zod-issue';
import { ERROR_CODES } from '../src/shared/api/codes/error-codes';
import { AsyncMutex } from '../src/shared/concurrency/AsyncMutex';

const descriptor: MigrationDescriptor = {
    version: '0001',
    name: 'installation',
    fileName: '0001__installation.sql',
    filePath: '/tmp/0001__installation.sql',
    checksum: 'checksum-1',
    sql: 'SELECT 1',
};

const historyRecord = (status: MigrationHistoryRecord['status'] = 'applied'): MigrationHistoryRecord => ({
    version: descriptor.version,
    name: descriptor.name,
    fileName: descriptor.fileName,
    checksum: descriptor.checksum,
    status,
    startedAt: new Date(0),
    finishedAt: status === 'applied' ? new Date(1) : null,
    executionMs: status === 'applied' ? 1 : null,
    errorMessage: status === 'failed' ? 'failure' : null,
    attemptCount: 1,
    appVersion: null,
    updatedAt: new Date(1),
});

it('buildMigrationPlan returns the next pending migration', () => {
    const plan = buildMigrationPlan([descriptor], []);
    expect(plan.next).toBe(descriptor);
    expect(plan.isComplete).toBe(false);
});

it('buildMigrationPlan rejects a failed migration', () => {
    expect(() => buildMigrationPlan([descriptor], [historyRecord('failed')]))
        .toThrow(MigrationRecoveryRequiredError);
});

it('buildMigrationPlan rejects a changed checksum', () => {
    const changed = { ...historyRecord(), checksum: 'different' };
    expect(() => buildMigrationPlan([descriptor], [changed])).toThrow(/checksum mismatch/i);
});

it('mapZodIssue distinguishes missing, invalid and too-short fields in Zod 4', () => {
    const schema = z.object({ name: z.string().min(3) });

    const missing = schema.safeParse({});
    expect(missing.success).toBe(false);
    if (!missing.success) {
        expect(mapZodIssue(missing.error.issues[0], {}).code).toBe(ERROR_CODES.VALIDATION_REQUIRED);
    }

    const invalid = schema.safeParse({ name: 1 });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
        expect(mapZodIssue(invalid.error.issues[0], { name: 1 }).code).toBe(ERROR_CODES.VALIDATION_INVALID_TYPE);
    }

    const tooShort = schema.safeParse({ name: 'a' });
    expect(tooShort.success).toBe(false);
    if (!tooShort.success) {
        const mapped = mapZodIssue(tooShort.error.issues[0], { name: 'a' });
        expect(mapped.code).toBe(ERROR_CODES.VALIDATION_STRING_TOO_SHORT);
        expect(mapped.params).toEqual({ min: 3 });
    }
});

it('AsyncMutex serializes concurrent critical sections', async () => {
    const mutex = new AsyncMutex();
    const order: string[] = [];

    const first = (async () => {
        const release = await mutex.acquire();
        order.push('first:start');
        await new Promise((resolve) => setTimeout(resolve, 10));
        order.push('first:end');
        release();
    })();

    const second = (async () => {
        const release = await mutex.acquire();
        order.push('second:start');
        release();
    })();

    await Promise.all([first, second]);
    expect(order).toEqual(['first:start', 'first:end', 'second:start']);
});
