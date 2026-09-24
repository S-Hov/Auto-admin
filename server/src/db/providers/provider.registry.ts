import type { DatabaseProvider } from "../contracts/provider.interface";
import { assertDatabaseSupported } from "../catalog/database.catalog";
import { DatabaseProviderNotFoundError } from "../errors/database.errors";
import type { DatabaseType } from "../contracts/database.types";
import { mysqlDatabaseProvider } from "./mysql/mysql.provider";

type DatabaseProviderMap = {
    [T in DatabaseType]: DatabaseProvider<T>;
};

const providers: Partial<DatabaseProviderMap> = {
    mysql: mysqlDatabaseProvider,
};

export const getDatabaseProvider = <TDatabaseType extends DatabaseType>(
    type: TDatabaseType,
): DatabaseProvider<TDatabaseType> => {
    assertDatabaseSupported(type);
    const provider = providers[type];
    if (!provider) {
        throw new DatabaseProviderNotFoundError(type);
    }
    return provider;
};
