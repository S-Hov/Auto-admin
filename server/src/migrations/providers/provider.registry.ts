import { assertDatabaseSubsystemSupported } from "../../db/catalog/database.catalog";
import type { DatabaseType } from "../../db/contracts/database.types";
import type { MigrationProvider } from "../contracts/migration-provider.interface";
import { MigrationProviderNotFoundError } from "../migration.errors";
import { mysqlMigrationProvider } from "./mysql/mysql-migration.provider";

type MigrationProviderMap = {
    [K in DatabaseType]: MigrationProvider<K>;
};

const providers: Partial<MigrationProviderMap> = {
    mysql: mysqlMigrationProvider,
};

export function getMigrationProvider<T extends DatabaseType>(type: T): MigrationProvider<T> {
    assertDatabaseSubsystemSupported(type, "migrations");
    const provider = providers[type];
    if (!provider) throw new MigrationProviderNotFoundError(type);
    return provider;
}
