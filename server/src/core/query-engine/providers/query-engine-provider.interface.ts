import type { DatabaseType } from "../../../db/contracts/database.types";
import type { DatabaseExecutor } from "../../../db/contracts/executor.interface";
import type { QueryCompiler } from "../compiler/query-compiler.interface";
import type { DatabaseDriver } from "../drivers/driver.types";

export interface QueryEngineProvider<
    TDatabaseType extends DatabaseType = DatabaseType,
> {
    readonly type: TDatabaseType;
    readonly compiler: QueryCompiler;
    createDriver(executor: DatabaseExecutor): DatabaseDriver;
}
