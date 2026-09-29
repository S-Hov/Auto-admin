import type { DatabaseExecutor } from "../../../../db/contracts/executor.interface";
import type { DatabaseDriver } from "../../contracts/database-driver.interface";
import type { QueryCompiler } from "../../contracts/query-compiler.interface";
import type { QueryEngineProvider } from "../../contracts/query-engine-provider.interface";
import { MySqlCompiler } from "./mysql-query.compiler";
import { MySqlDriver } from "./mysql-query.driver";

export class MySqlQueryEngineProvider implements QueryEngineProvider<"mysql"> {
    readonly type = "mysql";
    readonly compiler: QueryCompiler = new MySqlCompiler();

    createDriver(executor: DatabaseExecutor): DatabaseDriver {
        return new MySqlDriver(executor);
    }
}

export const mysqlQueryEngineProvider = new MySqlQueryEngineProvider();
