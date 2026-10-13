import { afterEach, expect, it, vi } from 'vitest';
import { auth } from '../src/shared/api/auth';
import { ApiContractError } from '../src/shared/api/apiClient';

const user = { userId: 1, username: 'admin', roleId: 1, roleKey: 'admin', rights: 'full', expiresAt: '2030-01-01T00:00:00.000Z' };
const endpoints = [
    { name: 'login', call: () => auth.login({ userName: 'admin', password: 'test' }), data: { redirectedTo: '/admin' } },
    { name: 'logout', call: () => auth.logout(), data: { redirectedTo: '/login' } },
    { name: 'me', call: () => auth.getMe(), data: user },
];
afterEach(() => vi.unstubAllGlobals());

it.each(endpoints)('accepts the existing $name response', async ({ call, data }) => {
    const body = { success: true, code: 'COMMON.OK', data };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body))));
    expect(await call()).toEqual(body);
});

it.each(endpoints)('requires data and its fields for $name', async ({ call }) => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Response(JSON.stringify({ success: true, code: 'COMMON.OK', data: {} }))));
    await expect(call()).rejects.toBeInstanceOf(ApiContractError);
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Response(JSON.stringify({ success: true, code: 'COMMON.OK' }))));
    await expect(call()).rejects.toBeInstanceOf(ApiContractError);
});

it.each([{ userId: '1' }, { rights: 'superuser' }, { expiresAt: 'invalid' }])('rejects malformed user data %j', async (patch) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, code: 'COMMON.OK', data: { ...user, ...patch } }))));
    await expect(auth.getMe()).rejects.toBeInstanceOf(ApiContractError);
});
