import { pageDataSchema, pageResponseSchema, pageRowsQuerySchema, pageRowsResponseSchema } from "@auto-admin/contracts/pages";
import { apiClient, ApiContractError } from "../apiClient";
import type { PageRowsParams } from './page.types';

export const pages = {
    async getPage(pageId: number, options?: { signal?: AbortSignal }) {
        const validId = pageDataSchema.shape.pageId.parse(pageId);
        const response = await apiClient(`/pages/${validId}`, pageResponseSchema, {
            method: 'GET',
            signal: options?.signal,
        });

        if (response.data.pageId !== pageId) throw new ApiContractError(200);
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
