import { apiClient, type UnifiedResponse } from "../apiClient"
import type { BootstrapStatusResponse } from "./bootstrap.types"

export const bootstrap = {
    getStatus() {
        return apiClient<UnifiedResponse<BootstrapStatusResponse>>('/bootstrap/status', {
            method: 'GET'
        })
    }
}