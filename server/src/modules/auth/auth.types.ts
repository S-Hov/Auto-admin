import { RowDataPacket } from "mysql2";
import { AutoAdmin } from "../../db/db.types";

export interface LoginData {
    userName: string;
    password: string;
}

export type LoginUserRow = RowDataPacket &
    Pick<AutoAdmin.User, 'id' | 'role_id' | 'username' | 'password_hash' | 'is_active'>

export type CreateSessionData =
    Pick<AutoAdmin.Session, 'user_id'
        | 'token_hash'
        | 'expires_at'
        | 'ip_address'
        | 'user_agent'
    >

export interface ActiveSessionRow extends RowDataPacket {
    sessionId: number;
    userId: number;
    username: string;
    roleId: number;
    roleKey: string;
    rights: 'full' | 'read_only' | 'manager' | 'none' | 'custom';
    expiresAt: Date;
}

export interface LoginServiceResult {
    token: string;
    expiresAt: Date;
    redirectedTo: string;
}

export interface LoginResponse {
    redirectedTo: string;
}