import { afterEach, expect, it, vi } from 'vitest';
import { auth } from '../src/shared/api/database/auth';
import { ApiContractError } from '../src/shared/api/apiClient';
import { HTTP_HEADERS } from '../src/constants/headers';

const form = { userName: 'admin', password: 'test', confirmPassword: 'test' };
afterEach(() => vi.unstubAllGlobals());

it('validates registration and preserves the installation token and request body', async () => {
    const body = { success: true, code: 'COMMON.OK', data: { redirectedTo: '/login' } };
    vi.stubGlobal('sessionStorage', { getItem: () => 'installation-token' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body))));
    expect(await auth.register(form)).toEqual(body);
    const options = vi.mocked(fetch).mock.calls[0][1];
    expect(options).toMatchObject({ method: 'POST', body: JSON.stringify(form) });
    expect(new Headers(options?.headers).get(HTTP_HEADERS.INSTALL_TOKEN)).toBe('installation-token');
});

it.each([undefined, {}, { redirectedTo: false }])('rejects invalid registration data %j', async (data) => {
    vi.stubGlobal('sessionStorage', { getItem: () => null });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, code: 'COMMON.OK', data }))));
    await expect(auth.register(form)).rejects.toBeInstanceOf(ApiContractError);
});
