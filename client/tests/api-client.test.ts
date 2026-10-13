import { afterEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { apiClient, ApiContractError, getBaseUrl } from '../src/shared/api/apiClient';
import { ApiClientError } from '../src/shared/api/ApiClientError';
import { apiResponseSchema } from '../src/shared/api/schema';

const schema = apiResponseSchema(z.looseObject({ id: z.number() }));
const respond = (body: unknown, status = 200) => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status }),
));

afterEach(() => vi.unstubAllGlobals());

it('validates data and preserves additional fields in the server response', async () => {
    const body = { success: true, code: 'COMMON.OK', extra: true, data: { id: 1, name: 'test' } };
    respond(body);
    expect(await apiClient('/test', schema)).toEqual(body);
});

it.each([undefined, null, { id: '1' }, { name: 'test' }])('rejects an invalid or missing payload: %j', async (data) => {
    respond({ success: true, code: 'COMMON.OK', data });
    await expect(apiClient('/test', schema)).rejects.toBeInstanceOf(ApiContractError);
});

it.each([200, 400])('preserves server errors, including params and field details (HTTP %i)', async (status) => {
    respond({ success: false, code: 'COMMON.BAD_REQUEST', params: { min: 1 }, details: [{ field: 'name', code: 'REQUIRED' }] }, status);
    await expect(apiClient('/test', schema)).rejects.toMatchObject({
        name: 'ApiClientError', status, code: 'COMMON.BAD_REQUEST', params: { min: 1 },
        details: [{ field: 'name', code: 'REQUIRED' }],
    });
});

it('rejects malformed JSON and exposes validation issues for a schema mismatch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>error</html>')));
    await expect(apiClient('/test', schema)).rejects.toBeInstanceOf(ApiContractError);
    respond({ success: true, code: 'COMMON.OK', data: { id: false } });
    await expect(apiClient('/test', schema)).rejects.toMatchObject({ status: 200, cause: { issues: expect.any(Array) } });
});

it('uses the existing fallback for an unstructured HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad gateway', { status: 502 })));
    const request = apiClient('/test', schema);
    await expect(request).rejects.toBeInstanceOf(ApiClientError);
    await expect(request).rejects.toMatchObject({ status: 502, code: 'COMMON.UNKNOWN_ERROR' });
});

it('preserves credentials, caller headers and cancellation', async () => {
    respond({ success: true, code: 'COMMON.OK', data: { id: 1 } });
    const signal = new AbortController().signal;
    await apiClient('/test', schema, { method: 'POST', body: '{}', headers: { 'X-Install-Token': 'token' }, signal });
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(`${getBaseUrl()}/api/test`);
    expect(options).toMatchObject({ credentials: 'include', method: 'POST', body: '{}', signal });
    expect(new Headers(options?.headers).get('X-Install-Token')).toBe('token');
    expect(new Headers(options?.headers).get('Content-Type')).toBe('application/json');
});

it('lets fetch set multipart headers and preserves network errors', async () => {
    respond({ success: true, code: 'COMMON.OK', data: { id: 1 } });
    await apiClient('/test', schema, { body: new FormData() });
    expect(new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers).has('Content-Type')).toBe(false);
    const error = new TypeError('Failed to fetch');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
    await expect(apiClient('/test', schema)).rejects.toBe(error);
});
