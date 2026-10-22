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

describe('menu delete API', () => {
    it('deletes the selected item with session credentials and no request body', async () => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true, code: 'COMMON.OK', data: { deleted: true } })));
        await expect(menu.deleteMenu(5)).resolves.toMatchObject({ data: { deleted: true } });
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe('http://localhost:5180/api/menu/5');
        expect(options?.method).toBe('DELETE');
        expect(options?.credentials).toBe('include');
        expect(options?.body).toBeUndefined();
        expect(fetchMock).toHaveBeenCalledOnce();
    });
    it.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])('rejects an invalid ID: %s', async (id) => {
        await expect(menu.deleteMenu(id)).rejects.toThrow();
        expect(fetchMock).not.toHaveBeenCalled();
    });
    it.each([{}, { deleted: false }, { deleted: 'true' }])('rejects an invalid deletion confirmation: %j', async (data) => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true, code: 'COMMON.OK', data })));
        await expect(menu.deleteMenu(5)).rejects.toBeInstanceOf(ApiContractError);
    });
    it('propagates server refusal without reporting successful deletion', async () => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false, code: 'MENU.INVALID' }), { status: 400 }));
        await expect(menu.deleteMenu(5)).rejects.toBeInstanceOf(ApiClientError);
    });
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
        expect(_id).toBe(5);
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
