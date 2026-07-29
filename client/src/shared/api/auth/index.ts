import { apiClient, type UnifiedResponse } from '../apiClient';
import type { AuthUser, LoginRequest, LoginResponse, LogoutResponse } from './auth.types';

export const auth = {
    login(data: LoginRequest) {
        return apiClient<UnifiedResponse<LoginResponse>>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    getMe() {
        return apiClient<UnifiedResponse<AuthUser>>('/auth/me', {
            method: 'GET'
        })
    },

    logout() {
        return apiClient<UnifiedResponse<LogoutResponse>>('/auth/logout', {
            method: 'POST'
        })
    },
}