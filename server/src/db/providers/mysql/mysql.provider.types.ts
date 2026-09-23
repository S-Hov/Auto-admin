export interface MySqlConnectionConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
}

export interface DbConnectionData {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}
