import type { DatabaseProvider } from "../../database-provider.interface";
import { DATABASE_CATALOG } from "../../database.catalog";

export const mysqlDatabaseProvider: DatabaseProvider = {
    type: 'mysql',
    descriptor: DATABASE_CATALOG.mysql,
};