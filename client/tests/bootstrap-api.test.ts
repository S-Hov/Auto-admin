import { afterEach, expect, it, vi } from 'vitest';
import { bootstrap } from '../src/shared/api/bootstrap';
import { ApiContractError } from '../src/shared/api/apiClient';

afterEach(() => vi.unstubAllGlobals());

it.each(['database_required', 'database_unavailable', 'migrations_required', 'migration_recovery_required', 'admin_required', 'ready', 'system_error'])('accepts bootstrap stage %s', async (stage) => {
    const body = { success: true, code: 'COMMON.OK', data: { stage } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body))));
    expect(await bootstrap.getStatus()).toEqual(body);
});

it.each([{}, { stage: 'unknown' }, { stage: 1 }, null])('rejects malformed bootstrap data %j', async (data) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, code: 'COMMON.OK', data }))));
    await expect(bootstrap.getStatus()).rejects.toBeInstanceOf(ApiContractError);
});
