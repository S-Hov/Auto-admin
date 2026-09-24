import { assertDatabaseSubsystemSupported } from "../../../db/database.catalog";
import type { DatabaseExecutor } from "../../../db/database-executor.interface";
import { UnsupportedDatabaseSubsystemError } from "../../../db/database.errors";
import type { DatabaseType } from "../../../db/database.types";
import { MySqlAuthRepository } from "./mysql/mysql.repository";
import type { AuthRepository } from "./repository.interface";

export const createAuthRepository = (
    databaseType: DatabaseType,
    executor: DatabaseExecutor,
): AuthRepository => {
    assertDatabaseSubsystemSupported(databaseType, "systemRepositories");

    switch (databaseType) {
        case "mysql":
            return new MySqlAuthRepository(executor);
        case "postgresql":
        case "sqlite":
            throw new UnsupportedDatabaseSubsystemError(
                databaseType,
                "systemRepositories",
            );
        default: {
            const exhaustiveCheck: never = databaseType;
            throw new Error(
                `Auth repository is not implemented for ${exhaustiveCheck}`,
            );
        }
    }
};
