import { RowDataPacket } from 'mysql2';

export namespace AutoAdmin {

    export interface Installation extends RowDataPacket {
        id: number,
        status: 'new' | 'migrated' | 'ready',
        updated_at: Date;
    }

    export interface User extends RowDataPacket {
        id: number;
        role_id: number;
        username: string;
        password_hash: string;
        is_active: boolean;
        last_login_at: Date | null;
        created_at: Date;
        updated_at: Date;
    }

    export interface CreateUser {
        role_id: number;
        username: string;
        password_hash: string;
        is_active?: boolean;
        last_login_at?: Date | null;
    }
    
    export interface UpdateUser {
        role_id?: number;
        username?: string;
        password_hash?: string;
        is_active?: boolean;
        last_login_at?: Date | null;
    }

    export interface Auth_logs extends RowDataPacket {
        id: number,
        user_id: number | null,
        event_type: string,
        ip_address: string | null,
        user_agent: string | null,
        created_at: Date,
    }

    export interface CreateAuth_logs {
        user_id: number | null,
        event_type: string,
        ip_address: string | null,
        user_agent: string | null,
    }

    export interface UpdateAuth_logs {
        user_id?: number | null,
        event_type?: string,
        ip_address?: string | null,
        user_agent?: string | null,
    }

}
