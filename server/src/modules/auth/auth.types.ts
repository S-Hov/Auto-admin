export interface LoginData {
    userName: string;
    password: string;
}

export interface LoginUserRow {
    id: number;
    role_id: number;
    username: string;
    password_hash: string;
    is_active: boolean;
}

export interface CreateSessionData {
    user_id: number;
    token_hash: string;
    expires_at: Date;
    ip_address: string | null;
    user_agent: string | null;
}

export interface ActiveSessionRow {
    sessionId: number;
    userId: number;
    username: string;
    roleId: number;
    roleKey: string;
    rights: 'full' | 'read_only' | 'manager' | 'none' | 'custom';
    expiresAt: Date;
}

export interface LoginAttemptsRow {
    userCountInWindow: number;
    ipCountInWindow: number;
    ipUserCountInWindow: number;
}

export interface LoginAttemptWindows {
    shortWindowSeconds: number;
    ipWindowSeconds: number;
}

export interface LoginServiceResult {
    token: string;
    expiresAt: Date;
    redirectedTo: string;
}

export interface LoginResponse {
    redirectedTo: string;
}

export interface LogoutResponse {
    redirectedTo: string;
}

export type GetMeServiceResult =
    Pick<ActiveSessionRow, 'userId'
        | 'username'
        | 'roleId'
        | 'roleKey'
        | 'expiresAt'
        | 'rights'
    >
