import { afterEach, expect, it, vi } from 'vitest';
import { installDatabase } from '../src/shared/api/database/install';
import { ApiContractError } from '../src/shared/api/apiClient';
import { HTTP_HEADERS } from '../src/constants/headers';

const step = { version: '0001', name: 'Initial', fileName: '0001__initial.sql' };
const applied = { applied: step, nextVersion: null, isComplete: true };
const endpoints = [
    { name: 'connection', call: () => installDatabase.checkTheConnection({ host: 'localhost', port: 3306, database: 'admin', user: 'root', password: 'test', type: 'mysql' }, 'token'), data: { version: '8.0' }, invalid: { version: 8 } },
    { name: 'plan', call: () => installDatabase.getMigrationPlan(), data: { pending: [step], nextVersion: '0001', isComplete: false }, invalid: { pending: [{ ...step, fileName: 1 }], nextVersion: '0001', isComplete: false } },
    { name: 'apply', call: () => installDatabase.applyNextMigration('0001'), data: applied, invalid: { ...applied, isComplete: 'true' } },
    { name: 'retry', call: () => installDatabase.retryMigration({ expectedVersion: '0001', checksum: 'abc' }), data: applied, invalid: { ...applied, applied: { version: '0001' } } },
    { name: 'mark applied', call: () => installDatabase.markMigrationApplied({ expectedVersion: '0001', checksum: 'abc' }), data: applied, invalid: { ...applied, nextVersion: 1 } },
    { name: 'recovery', call: () => installDatabase.getRecoveryInfo(), data: { version: '0001', name: 'Initial', checksum: 'abc', status: 'failed' }, invalid: { version: '0001', name: 'Initial', checksum: 'abc', status: 'applied' } },
];
afterEach(() => vi.unstubAllGlobals());

it.each(endpoints)('validates $name without changing request tokens', async ({ call, data }) => {
    const body = { success: true, code: 'COMMON.OK', data };
    vi.stubGlobal('sessionStorage', { getItem: () => 'token' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body))));
    expect(await call()).toEqual(body);
    expect(new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers).get(HTTP_HEADERS.INSTALL_TOKEN)).toBe('token');
});

it.each(endpoints)('rejects missing and malformed $name payloads', async ({ call, invalid }) => {
    vi.stubGlobal('sessionStorage', { getItem: () => 'token' });
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Response(JSON.stringify({ success: true, code: 'COMMON.OK', data: invalid }))));
    await expect(call()).rejects.toBeInstanceOf(ApiContractError);
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Response(JSON.stringify({ success: true, code: 'COMMON.OK' }))));
    await expect(call()).rejects.toBeInstanceOf(ApiContractError);
});

it('accepts a completed migration with no applied step', async () => {
    const body = { success: true, code: 'COMMON.OK', data: { applied: null, nextVersion: null, isComplete: true } };
    vi.stubGlobal('sessionStorage', { getItem: () => 'token' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body))));
    expect(await installDatabase.applyNextMigration('0001')).toEqual(body);
});
