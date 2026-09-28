import { assertDatabaseSubsystemSupported } from "../../../../db/catalog/database.catalog";
import type { DatabaseType } from "../../../../db/contracts/database.types";
import { UnsupportedDatabaseSubsystemError } from "../../../../db/errors/database.errors";
import type { DatabaseExecutor } from "../../../../db/contracts/executor.interface";
import { MySqlRegisterAdminRepository } from "./mysql/mysql.repository";
import type { RegisterAdminRepository } from "./repository.interface";

export const createRegisterAdminRepository = (
    databaseType: DatabaseType,
    executor: DatabaseExecutor,
): RegisterAdminRepository => {
    assertDatabaseSubsystemSupported(databaseType, "systemRepositories");

    switch (databaseType) {
        case "mysql":
            return new MySqlRegisterAdminRepository(executor);
        case "postgresql":
        case "sqlite":
            throw new UnsupportedDatabaseSubsystemError(
                databaseType,
                "systemRepositories",
            );
        default: {
            const exhaustiveCheck: never = databaseType;
            throw new Error(
                `Register Admin repository is not implemented for ${exhaustiveCheck}`,
            );
        }
    }
};