
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


export interface AdminLookupRow {
    id: number;
    username: string;
}
