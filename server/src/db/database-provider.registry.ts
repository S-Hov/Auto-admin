import type { DatabaseProvider } from "./database-provider.interface";
import { assertDatabaseSupported } from "./database.catalog";
import { UnsupportedDatabaseError } from "./database.errors";
import type { DatabaseType } from "./database.types";
import { mysqlDatabaseProvider } from "./providers/mysql/mysql.provider";

const providers: Partial<Record<DatabaseType, DatabaseProvider>> = {
    mysql: mysqlDatabaseProvider,
};

export const getDatabaseProvider = (type: DatabaseType): DatabaseProvider => {
    assertDatabaseSupported(type)
    const provider = providers[type];
    if (!provider) {
        throw new UnsupportedDatabaseError(type);
    }
    return provider;
}