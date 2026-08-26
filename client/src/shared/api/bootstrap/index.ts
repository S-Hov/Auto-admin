import { apiClient } from "../apiClient"
import type { UnifiedResponse } from "../types"
import type { BootstrapStatusResponse } from "./bootstrap.types"

export const bootstrap = {
    getStatus() {
        return apiClient<UnifiedResponse<BootstrapStatusResponse>>('/bootstrap/status', {
            method: 'GET'
        })
    }
}