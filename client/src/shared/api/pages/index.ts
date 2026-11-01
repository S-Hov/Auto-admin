import { pageDataSchema, pageResponseSchema } from "@auto-admin/contracts/pages"
import { apiClient, ApiContractError } from "../apiClient";

export const pages = {
    async getPage(pageId: number, options?: { signal?: AbortSignal }) {
        const validId = pageDataSchema.shape.pageId.parse(pageId);
        const response = await apiClient(`/pages/${validId}`, pageResponseSchema, {
            method: 'GET',
            signal: options?.signal,
        });

        if (response.data.pageId !== pageId) new ApiContractError(200);
       return response 
    }
}