import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { menu } from './index';
import type { MenuSaveData } from './menu.types';
import { ApiClientError } from '../ApiClientError';
import { ApiContractError } from '../apiClient';

const data: MenuSaveData = { id: 5, parentId: null, name: 'Orders', slug: 'orders', icon: null, iconType: 'icon', sortOrder: 10, isActive: true };
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:5180');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('menu save API', () => {
    it('sends JSON and includes session credentials', async () => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true, code: 'COMMON.OK', data: { id: 5 } })));
        await expect(menu.saveMenu(data)).resolves.toMatchObject({ data: { id: 5 } });
        expect(fetchMock).toHaveBeenCalledOnce();
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe('http://localhost:5180/api/menu');
        expect(options?.method).toBe('POST');
        expect(options?.credentials).toBe('include');
        expect(JSON.parse(options?.body as string)).toEqual(data);
    });
    it('allows creation without an ID through the existing create method', async () => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true, code: 'COMMON.OK', data: { id: 8 } })));
        const { id: _id, ...create } = data;
        await expect(menu.createMenu(create)).resolves.toMatchObject({ data: { id: 8 } });
    });
    it('preserves server validation details', async () => {
        const details = [{ field: 'slug', code: 'VALIDATION.INVALID_VALUE' }];
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false, code: 'COMMON.VALIDATION_FAILED', details }), { status: 400 }));
        await expect(menu.saveMenu(data)).rejects.toMatchObject({ details });
    });
    it('rejects denied saves', async () => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false, code: 'ACCESS.ADMIN_REQUIRED' }), { status: 403 }));
        await expect(menu.saveMenu(data)).rejects.toBeInstanceOf(ApiClientError);
    });
    it.each([{}, { id: '5' }, { id: 99 }])('rejects malformed or mismatched confirmation: %j', async (confirmation) => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true, code: 'COMMON.OK', data: confirmation })));
        await expect(menu.saveMenu(data)).rejects.toBeInstanceOf(ApiContractError);
    });
    it('does not send invalid data', async () => {
        await expect(menu.saveMenu({ ...data, name: '' })).rejects.toThrow();
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
