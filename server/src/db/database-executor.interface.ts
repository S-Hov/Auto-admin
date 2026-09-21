export interface DatabaseCommandResult {
    affectedRows: number;
    insertId: number | string | null;
}

export interface DatabaseExecutor {
    queryRows<TRow>(sql: string, params?: readonly string[]): Promise<TRow[]>;

    execute: (sql: string, params?: readonly string[]) => Promise<DatabaseCommandResult>;
}

export interface DatabaseConnection extends DatabaseExecutor{
    transaction<T>(callback: (executor: DatabaseExecutor) => Promise<T>): Promise<T>;
}
