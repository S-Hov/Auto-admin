export type { RegisterData } from '@auto-admin/contracts/install';

export interface RequestMeta {
    ipAddress: string | null;
    userAgent: string | null;
}

export interface UserRole {
    id: number;
    key: string;
    name: string;
    rights: 'full' | 'read_only' | 'manager' | 'none' | 'custom';
}

export type { RegisterResponse } from '@auto-admin/contracts/install';

export interface AdminLookupRow {
    id: number;
    username: string;
}
