import { CompiledQuery } from "../compiler/mysql.compiler";

export interface QueryResult<T> {
    rows: T[];
    affectedRows: number;
    insertId?: number | string | null;
    raw?: unknown;
}

export interface DatabaseDriver {
    execute<T = unknown>(query: CompiledQuery): Promise<QueryResult<T>>;
    ping(): Promise<boolean>;
    close(): Promise<void>;
}