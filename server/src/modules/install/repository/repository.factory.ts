import { assertDatabaseSubsystemSupported } from "../../../db/catalog/database.catalog";
import type { DatabaseType } from "../../../db/contracts/database.types";
import { UnsupportedDatabaseSubsystemError } from "../../../db/errors/database.errors";
import type { DatabaseExecutor } from "../../../db/contracts/executor.interface";
import { MySqlInstallRepository } from "./mysql/mysql.repository";
import type { InstallRepository } from "./repository.interface";

export const createInstallRepository = (
    databaseType: DatabaseType,
    executor: DatabaseExecutor,
): InstallRepository => {
    assertDatabaseSubsystemSupported(databaseType, "systemRepositories");

    switch (databaseType) {
        case "mysql":
            return new MySqlInstallRepository(executor);
        case "postgresql":
        case "sqlite":
            throw new UnsupportedDatabaseSubsystemError(
                databaseType,
                "systemRepositories",
            );
        default: {
            const exhaustiveCheck: never = databaseType;
            throw new Error(
                `Install repository is not implemented for ${exhaustiveCheck}`,
            );
        }
    }
};
