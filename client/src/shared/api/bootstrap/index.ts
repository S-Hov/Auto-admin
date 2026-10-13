import { apiClient } from "../apiClient"
import { bootstrapResponseSchema } from "./bootstrap.schema"

export const bootstrap = {
    getStatus() {
        return apiClient('/bootstrap/status', bootstrapResponseSchema, {
            method: 'GET'
        })
    }
}
