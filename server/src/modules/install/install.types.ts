export interface DbConnectionData {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}

export interface DbCheckResponse {
    version?: string;
}

export interface registerData {
    userName: string;
    password: string;
    confirmPassword: string;
}

export interface registerResponse {
    redirectedTo?: string,
}