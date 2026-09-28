export interface DatabaseCommandResult {
    affectedRows: number;
    insertId: number | string | null;
}

export interface DatabaseExecuteOptions {
    // null disables the regular query timeout for long-running DDL migrations.
    timeoutMs?: number | null;
}

export interface DatabaseExecutor {
    queryRows<TRow = unknown>(
        sql: string,
        params?: readonly unknown[],
    ): Promise<TRow[]>;

    execute(
        sql: string,
        params?: readonly unknown[],
        options?: DatabaseExecuteOptions,
    ): Promise<DatabaseCommandResult>;
}

export interface DatabaseConnection extends DatabaseExecutor {
    /** Remove this connection from the pool when its session state is unsafe to reuse. */
    discard(): void;

    transaction<T>(
        callback: (executor: DatabaseExecutor) => Promise<T>,
    ): Promise<T>;
}
