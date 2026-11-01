import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pages } from '../src/shared/api/pages';
import { ApiClientError } from '../src/shared/api/ApiClientError';
import { ApiContractError } from '../src/shared/api/apiClient';

function page() {
    return {
        pageId: 42, name: 'Заказы', description: null, revision: 3,
        config: {
            schemaVersion: 1,
            source: { resourceId: 1, recordKey: null },
            fields: [{ id: 'total', fieldId: 101, label: 'Сумма', display: { type: 'number' } }],
            list: {
                columns: ['total'], sorting: { allowed: ['total'], default: [] },
                pagination: { defaultPageSize: 25, pageSizeOptions: [25] },
            },
        },
    };
}

function success(data: unknown = page()) {
    return new Response(JSON.stringify({ success: true, code: 'COMMON.OK', data }));
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:5180');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe('pages.getPage', () => {
    it('gets a page with session credentials and returns a validated envelope', async () => {
        fetchMock.mockResolvedValue(success());
        await expect(pages.getPage(42)).resolves.toEqual({ success: true, code: 'COMMON.OK', data: page() });
        expect(fetchMock).toHaveBeenCalledOnce();
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe('http://localhost:5180/api/pages/42');
        expect(options?.method).toBe('GET');
        expect(options?.credentials).toBe('include');
        expect(options?.body).toBeUndefined();
    });

    it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects invalid pageId %s before the request', async (pageId) => {
        await expect(pages.getPage(pageId)).rejects.toThrow();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('passes an AbortSignal to fetch', async () => {
        fetchMock.mockResolvedValue(success());
        const controller = new AbortController();
        await pages.getPage(42, { signal: controller.signal });
        expect(fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal);
    });

    it('preserves request cancellation rather than reporting an API error', async () => {
        const error = new DOMException('Request cancelled', 'AbortError');
        fetchMock.mockRejectedValue(error);
        await expect(pages.getPage(42)).rejects.toBe(error);
    });

    it.each([{}, { ...page(), revision: 0 }, { ...page(), config: { schemaVersion: 999 } }])('rejects an invalid response: %j', async (data) => {
        fetchMock.mockResolvedValue(success(data));
        await expect(pages.getPage(42)).rejects.toBeInstanceOf(ApiContractError);
    });

    it('rejects a response containing a different page ID', async () => {
        fetchMock.mockResolvedValue(success({ ...page(), pageId: 43 }));
        await expect(pages.getPage(42)).rejects.toBeInstanceOf(ApiContractError);
    });

    it('preserves extra response fields allowed by looseObject', async () => {
        fetchMock.mockResolvedValue(success({ ...page(), extra: 'metadata' }));
        expect((await pages.getPage(42)).data.extra).toBe('metadata');
    });

    it('preserves a structured server error', async () => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false, code: 'COMMON.NOT_FOUND' }), { status: 404 }));
        await expect(pages.getPage(42)).rejects.toBeInstanceOf(ApiClientError);
    });
});
