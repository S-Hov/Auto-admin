import { assertDatabaseSubsystemSupported } from "../../../db/catalog/database.catalog";
import type { DatabaseType } from "../../../db/contracts/database.types";
import type { SchemaCatalogProvider } from "../contracts/schema-catalog-provider.interface";
import { mysqlSchemaCatalogProvider } from "./mysql/mysql-schema-catalog.provider";
import { SchemaCatalogProviderNotFoundError } from "./schema-catalog-provider.errors";

type SchemaCatalogProviderMap = {
    [K in DatabaseType]: SchemaCatalogProvider<K>;
}

const schemaCatalogProviders: Partial<SchemaCatalogProviderMap> = {
    mysql: mysqlSchemaCatalogProvider,
}

export function getSchemaCatalogProvider<T extends DatabaseType>(
    type: T,
): SchemaCatalogProvider<T> {
    assertDatabaseSubsystemSupported(type, "schemaCatalog");
    const provider = schemaCatalogProviders[type];
    if (!provider) {
        throw new SchemaCatalogProviderNotFoundError(type);
    }
    return provider;
}