import type { AutoAdmin } from "../../db/db.types";

export interface LoginData {
    userName: string;
    password: string;
}

export type LoginUserRow = Pick<
    AutoAdmin.User,
    'id' | 'role_id' | 'username' | 'password_hash' | 'is_active'
>;

export type CreateSessionData =
    Pick<AutoAdmin.Session, 'user_id'
        | 'token_hash'
        | 'expires_at'
        | 'ip_address'
        | 'user_agent'
    >

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
