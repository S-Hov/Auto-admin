import { apiClient } from '../apiClient';
import type { LoginRequest } from './auth.types';
import { authUserResponseSchema, loginResponseSchema, logoutResponseSchema } from './auth.schema';

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
