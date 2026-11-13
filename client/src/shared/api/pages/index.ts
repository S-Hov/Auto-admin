import { pageDataSchema, pageResponseSchema, pageRowsQuerySchema, pageRowsResponseSchema, type PageRowsParams } from "@auto-admin/contracts/pages";
import { apiClient, ApiContractError } from "../apiClient";
import { configureMenuPageSchema, pageListQuerySchema, pageListResponseSchema, pageResolveParamsSchema, pageSaveResponseSchema, type ConfigureMenuPageData } from '@auto-admin/contracts/pages';
import { updatePageSchema, type UpdatePageData } from '@auto-admin/contracts/pages';

export const pages = {
    async update(pageId: number, data: UpdatePageData) {
        const id = pageDataSchema.shape.pageId.parse(pageId);
        const payload = updatePageSchema.parse(data);
        const response = await apiClient(`/pages/${id}`, pageSaveResponseSchema, { method: 'PUT', body: JSON.stringify(payload) });
        if (response.data.pageId !== id || response.data.revision !== payload.revision + 1) throw new ApiContractError(200);
        return response;
    },
    async list(params: { q?: string; offset?: number } = {}, options?: { signal?: AbortSignal }) {
        const valid = pageListQuerySchema.parse({ q: params.q, offset: String(params.offset ?? 0) });
        const search = new URLSearchParams({ q: valid.q, limit: String(valid.limit), offset: String(valid.offset) });
        return apiClient(`/pages?${search}`, pageListResponseSchema, { method: 'GET', signal: options?.signal });
    },
    async configureForMenu(slug: string, data: ConfigureMenuPageData) {
        const valid = pageResolveParamsSchema.parse({ slug });
        const payload = configureMenuPageSchema.parse(data);
        return apiClient(`/pages/for-menu/${encodeURIComponent(valid.slug)}`, pageSaveResponseSchema, { method: 'POST', body: JSON.stringify(payload) });
    },
    async getPage(pageId: number, options?: { signal?: AbortSignal }) {
        const validId = pageDataSchema.shape.pageId.parse(pageId);
        const response = await apiClient(`/pages/${validId}`, pageResponseSchema, {
            method: 'GET',
            signal: options?.signal,
        });

        if (response.data.pageId !== pageId) throw new ApiContractError(200);
        return response;
    },
    async getBySlug(slug: string, options?: { signal?: AbortSignal }) {
        const valid = pageResolveParamsSchema.parse({ slug });
        const response = await apiClient(`/pages/resolve/${encodeURIComponent(valid.slug)}`, pageResponseSchema, {
            method: 'GET',
            signal: options?.signal,
        });

        return response;
    },
    async getRows(pageId: number, params: PageRowsParams = {}, options?: { signal?: AbortSignal }) {
        const validId = pageDataSchema.shape.pageId.parse(pageId);
        const query = pageRowsQuerySchema.parse(params);
        const search = new URLSearchParams({ offset: String(query.offset) });
        if (query.limit !== undefined) search.set('limit', String(query.limit));
        if (query.sort) {
            search.set('sortField', query.sort.field);
            search.set('sortDirection', query.sort.direction);
        }
        const response = await apiClient(`/pages/${validId}/rows?${search}`, pageRowsResponseSchema, {
            method: 'GET', signal: options?.signal,
        });
        if (response.data.pageId !== validId || response.data.pagination.offset !== query.offset ||
            (query.limit !== undefined && response.data.pagination.limit !== query.limit)) {
            throw new ApiContractError(200);
        }
        return response;
    },
};
