export interface RegisterData {
    userName: string;
    password: string;
    confirmPassword: string;
}

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

export interface RegisterResponse {
    redirectedTo: string;
}

export interface AdminLookupRow {
    id: number;
    username: string;
}
