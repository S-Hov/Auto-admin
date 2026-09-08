import { apiClient } from '../apiClient';
import type { AuthUser, LoginRequest, LoginResponse, LogoutResponse } from './auth.types';

export const auth = {
    login(data: LoginRequest) {
        return apiClient<LoginResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    getMe() {
        return apiClient<AuthUser>('/auth/me', {
            method: 'GET'
        })
    },

    logout() {
        return apiClient<LogoutResponse>('/auth/logout', {
            method: 'POST'
        })
    },
}
