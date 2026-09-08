import { apiClient } from "../apiClient"
import type { BootstrapStatusResponse } from "./bootstrap.types"

export const bootstrap = {
    getStatus() {
        return apiClient<BootstrapStatusResponse>('/bootstrap/status', {
            method: 'GET'
        })
    }
}
