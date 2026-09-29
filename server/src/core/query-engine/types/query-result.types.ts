export interface QueryResult<T> {
    rows: T[];
    affectedRows: number;
    insertId?: number | string | null;
    raw?: unknown;
}
