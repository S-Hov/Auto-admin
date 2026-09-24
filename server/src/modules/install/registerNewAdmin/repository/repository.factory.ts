import { DatabaseType } from "../../../../db/contracts/database.types";
import { DatabaseExecutor } from "../../../../db/contracts/executor.interface";
import { RegisterAdminRepository } from "./repository.interface";
import { assertDatabaseSubsystemSupported } from "../../../../db/catalog/database.catalog";
import { UnsupportedDatabaseSubsystemError } from "../../../../db/errors/database.errors";
import { MySqlRegisterAdminRepository } from "./mysql/mysql.repository";

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