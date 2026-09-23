import type { DatabaseProvider } from "./database-provider.interface";
import { assertDatabaseSupported } from "./database.catalog";
import { DatabaseProviderNotFoundError } from "./database.errors";
import type { DatabaseType } from "./database.types";
import { mysqlDatabaseProvider } from "./providers/mysql/mysql.provider";

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
