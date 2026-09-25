import type { DatabaseExecutor } from "../../../../db/contracts/executor.interface";
import { MySqlCompiler } from "../../compiler/mysql.compiler";
import type { QueryCompiler } from "../../compiler/query-compiler.interface";
import type { DatabaseDriver } from "../../drivers/driver.types";
import { MySqlDriver } from "../../drivers/mysql.driver";
import type { QueryEngineProvider } from "../query-engine-provider.interface";

export class MySqlQueryEngineProvider implements QueryEngineProvider<"mysql"> {
    readonly type = "mysql";
    readonly compiler: QueryCompiler = new MySqlCompiler();

    createDriver(executor: DatabaseExecutor): DatabaseDriver {
        return new MySqlDriver(executor);
    }
}
