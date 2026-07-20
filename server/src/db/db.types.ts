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

    export interface Session extends RowDataPacket {
        id: number;
        user_id: number;
        token_hash: string;
        expires_at: Date;
        created_at: Date;
        revoked_at: Date | null;
        last_seen_at: Date | null;
        ip_address: string | null;
        user_agent: string | null;
    }

    export interface Auth_logs extends RowDataPacket {
        id: number,
        user_id: number | null,
        event_type: string,
        ip_address: string | null,
        user_agent: string | null,
        created_at: Date,
    }
}
