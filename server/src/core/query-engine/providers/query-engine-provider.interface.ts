import type { DatabaseExecutor } from "../../../db/contracts/executor.interface";
import type { QueryCompiler } from "../compiler/query-compiler.interface";
import type { DatabaseDriver } from "../drivers/driver.types";

export interface QueryEngineProvider<TDatabaseType> {
    type: TDatabaseType;
    compiler: QueryCompiler;
    createDriver(executor: DatabaseExecutor): DatabaseDriver;
}