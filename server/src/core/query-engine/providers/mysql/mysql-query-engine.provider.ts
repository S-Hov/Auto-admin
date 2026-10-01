import type { DatabaseExecutor } from "../../../../db/contracts/executor.interface";
import type { DatabaseDriver } from "../../contracts/database-driver.interface";
import type { QueryCompiler } from "../../contracts/query-compiler.interface";
import type { QueryEngineProvider } from "../../contracts/query-engine-provider.interface";
import { MySqlCompiler } from "./mysql-query.compiler";
import { MySqlDriver } from "./mysql-query.driver";
import type { StoredResource } from "../../../schema-catalog/types/schema-catalog.types";

export class MySqlQueryEngineProvider implements QueryEngineProvider<"mysql"> {
    readonly type = "mysql";
    readonly compiler: QueryCompiler = new MySqlCompiler();

    createDriver(executor: DatabaseExecutor): DatabaseDriver {
        return new MySqlDriver(executor);
    }

    supportsTransactionalWrites(resource: Readonly<StoredResource>): boolean {
        return resource.engine?.toLowerCase() === "innodb";
    }
}

export const mysqlQueryEngineProvider = new MySqlQueryEngineProvider();
