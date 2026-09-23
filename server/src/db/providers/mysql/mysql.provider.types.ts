import type { RowDataPacket } from "mysql2/promise";

export interface MySqlConnectionConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
}

export interface VersionRow extends RowDataPacket {
    version: string;
}

export interface DbConnectionData {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}