import { assertDatabaseSubsystemSupported } from "../../../db/catalog/database.catalog";
import type { DatabaseType } from "../../../db/contracts/database.types";
import type { QueryEngineProvider } from "../contracts/query-engine-provider.interface";
import { mysqlQueryEngineProvider } from "./mysql/mysql-query-engine.provider";
import { QueryEngineProviderNotFoundError } from "./query-engine-provider.errors";

type QueryEngineProviderMap = {
    [K in DatabaseType]: QueryEngineProvider<K>;
};

const queryEngineProviders: Partial<QueryEngineProviderMap> = {
    mysql: mysqlQueryEngineProvider,
};

export function getQueryEngineProvider<T extends DatabaseType>(
    type: T,
): QueryEngineProvider<T> {
    assertDatabaseSubsystemSupported(type, "queryEngine");
    const provider = queryEngineProviders[type];
    if (!provider) {
        throw new QueryEngineProviderNotFoundError(type);
    }
    return provider;
}
