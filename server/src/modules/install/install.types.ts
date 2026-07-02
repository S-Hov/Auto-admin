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