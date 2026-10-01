import { assertDatabaseSubsystemSupported } from "../../../db/catalog/database.catalog";
import type { DatabaseType } from "../../../db/contracts/database.types";
import type { AccessControlProvider } from "../contracts/access-control-provider.interface";
import { AccessControlProviderNotFoundError } from "./access-control-provider.errors";
import { mySqlAccessControlProvider } from "./mysql/mysql-access-control.provider";

type AccessControlProviderMap = {
    [K in DatabaseType]: AccessControlProvider<K>;
};

const accessControlProviders: Partial<AccessControlProviderMap> = {
    mysql: mySqlAccessControlProvider,
};

export function getAccessControlProvider<T extends DatabaseType>(
    type: T,
): AccessControlProvider<T> {
    assertDatabaseSubsystemSupported(type, "accessControl");
    const provider = accessControlProviders[type];
    if (!provider) {
        throw new AccessControlProviderNotFoundError(type);
    }
    return provider;
}
