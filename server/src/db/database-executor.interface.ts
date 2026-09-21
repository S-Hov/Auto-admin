export interface DatabaseCommandResult {
    affectedRows: number;
    insertId: number | string | null;
}

export interface DatabaseExecutor {
    queryRows<TRow = unknown>(
        sql: string,
        params?: readonly unknown[],
    ): Promise<TRow[]>;

    execute(
        sql: string,
        params?: readonly unknown[],
    ): Promise<DatabaseCommandResult>;
}

export interface DatabaseConnection extends DatabaseExecutor {
    transaction<T>(
        callback: (executor: DatabaseExecutor) => Promise<T>,
    ): Promise<T>;
}
