import { apiClient } from '../apiClient';
import { type LoginRequest, authUserResponseSchema, loginResponseSchema, logoutResponseSchema } from "@auto-admin/contracts/auth";

export const auth = {
    login(data: LoginRequest) {
        return apiClient('/auth/login', loginResponseSchema, {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    getMe() {
        return apiClient('/auth/me', authUserResponseSchema, {
            method: 'GET'
        })
    },

    logout() {
        return apiClient('/auth/logout', logoutResponseSchema, {
            method: 'POST'
        })
    },
}
