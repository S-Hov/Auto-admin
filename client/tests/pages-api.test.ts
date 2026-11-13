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

describe('pages.update', () => {
    const payload = () => { const data = page(); return { name: data.name, description: data.description, config: data.config, revision: data.revision }; };
    it('sends the revision with the draft to the update endpoint', async () => {
        fetchMock.mockResolvedValue(success({ pageId: 42, revision: 4 }));
        await pages.update(42, payload());
        expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:5180/api/pages/42');
        expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PUT', credentials: 'include' });
        expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual(payload());
    });
    it('rejects invalid drafts before sending a request', async () => {
        await expect(pages.update(42, { ...payload(), name: '' })).rejects.toThrow();
        await expect(pages.update(42, { ...payload(), revision: 0 })).rejects.toThrow();
        expect(fetchMock).not.toHaveBeenCalled();
    });
    it('preserves revision conflict errors', async () => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false, code: 'COMMON.CONFLICT' }), { status: 409 }));
        await expect(pages.update(42, payload())).rejects.toMatchObject({ status: 409 });
    });
    it.each([{ pageId: 43, revision: 4 }, { pageId: 42, revision: 3 }])('rejects a mismatched save response: %j', async result => {
        fetchMock.mockResolvedValue(success(result));
        await expect(pages.update(42, payload())).rejects.toBeInstanceOf(ApiContractError);
    });
});

describe('pages.getRows', () => {
    function rows(overrides = {}) {
        return { pageId: 42, revision: 3, rows: [{ total: 0 }], pagination: { limit: 25, offset: 0, hasMore: false }, ...overrides };
    }
    it('serializes numeric pagination and sorting using the shared contract', async () => {
        fetchMock.mockResolvedValue(success(rows({ pagination: { limit: 50, offset: 100, hasMore: true } })));
        const signal = new AbortController().signal;
        await pages.getRows(42, { limit: 50, offset: 100, sort: { field: 'total', direction: 'desc' } }, { signal });
        const [url, options] = fetchMock.mock.calls[0];
        const request = new URL(String(url));
        expect(request.pathname).toBe('/api/pages/42/rows');
        expect(Object.fromEntries(request.searchParams)).toEqual({ limit: '50', offset: '100', sortField: 'total', sortDirection: 'desc' });
        expect(options).toMatchObject({ method: 'GET', credentials: 'include', signal });
    });
    it('keeps the page-config limit when no limit is supplied', async () => {
        fetchMock.mockResolvedValue(success(rows()));
        expect((await pages.getRows(42)).data.rows).toEqual([{ total: 0 }]);
        expect(String(fetchMock.mock.calls[0][0])).not.toContain('limit=');
    });
    it.each([
        { pageId: 43 }, { revision: 0 }, { rows: 'invalid' },
        { pagination: { limit: 25, offset: 1, hasMore: false } },
    ])('rejects an invalid or mismatched response: %j', async (overrides) => {
        fetchMock.mockResolvedValue(success(rows(overrides)));
        await expect(pages.getRows(42)).rejects.toBeInstanceOf(ApiContractError);
    });
    it('rejects an unexpected explicit page size', async () => {
        fetchMock.mockResolvedValue(success(rows()));
        await expect(pages.getRows(42, { limit: 50 })).rejects.toBeInstanceOf(ApiContractError);
    });
    it('does not send invalid parameters', async () => {
        await expect(pages.getRows(42, { offset: -1 })).rejects.toThrow();
        await expect(pages.getRows(0)).rejects.toThrow();
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

describe('page configuration API', () => {
    it('sends a validated command to the atomic menu binding endpoint', async () => {
        fetchMock.mockResolvedValue(success({ pageId: 42, revision: 1 }));
        await pages.configureForMenu('orders', { mode: 'existing', pageId: 42 });
        expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:5180/api/pages/for-menu/orders');
        expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', credentials: 'include', body: JSON.stringify({ mode: 'existing', pageId: 42 }) });
    });
    it('does not send invalid slugs, page IDs or list pagination', async () => {
        await expect(pages.configureForMenu('../other', { mode: 'existing', pageId: 42 })).rejects.toThrow();
        await expect(pages.configureForMenu('orders', { mode: 'existing', pageId: 0 })).rejects.toThrow();
        await expect(pages.list({ offset: -1 })).rejects.toThrow();
        expect(fetchMock).not.toHaveBeenCalled();
    });
    it('encodes list search and forwards cancellation', async () => {
        fetchMock.mockResolvedValue(success({ items: [], pagination: { limit: 25, offset: 25, hasMore: false } }));
        const signal = new AbortController().signal;
        await pages.list({ q: 'Заказы & оплата', offset: 25 }, { signal });
        const url = new URL(String(fetchMock.mock.calls[0][0]));
        expect(url.searchParams.get('q')).toBe('Заказы & оплата');
        expect(url.searchParams.get('offset')).toBe('25');
        expect(fetchMock.mock.calls[0][1]?.signal).toBe(signal);
    });
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
