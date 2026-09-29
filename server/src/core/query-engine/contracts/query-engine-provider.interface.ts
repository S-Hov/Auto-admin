import type { DatabaseType } from "../../../db/contracts/database.types";
import type { DatabaseExecutor } from "../../../db/contracts/executor.interface";
import type { DatabaseDriver } from "./database-driver.interface";
import type { QueryCompiler } from "./query-compiler.interface";

export interface QueryEngineProvider<
    TDatabaseType extends DatabaseType = DatabaseType,
> {
    readonly type: TDatabaseType;
    readonly compiler: QueryCompiler;
    createDriver(executor: DatabaseExecutor): DatabaseDriver;
}
