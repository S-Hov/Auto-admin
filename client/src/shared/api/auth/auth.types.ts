export interface LoginRequest {
    userName: string;
    password: string;
}

export interface LoginResponse {
    redirectedTo: string;
}

export interface LogoutResponse {
    redirectedTo: string;
}

export interface AuthUser {
    userId: number;
    username: string;
    roleId: number;
    roleKey: string;
    rights: 'full' | 'read_only' | 'manager' | 'none' | 'custom';
    expiresAt: string;
}