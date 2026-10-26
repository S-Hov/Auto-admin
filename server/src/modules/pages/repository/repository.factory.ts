import { assertDatabaseSubsystemSupported } from "../../../db/catalog/database.catalog";
import type { DatabaseType } from "../../../db/contracts/database.types";
import type { DatabaseExecutor } from "../../../db/contracts/executor.interface";
import { UnsupportedDatabaseSubsystemError } from "../../../db/errors/database.errors";
import { MySqlPageRepository } from "./mysql/mysql.repository";
import type { PageRepository } from "./repository.interface";

export const createPageRepository = (
    databaseType: DatabaseType,
    executor: DatabaseExecutor,
): PageRepository => {
    assertDatabaseSubsystemSupported(databaseType, "systemRepositories");

    switch (databaseType) {
        case "mysql":
            return new MySqlPageRepository(executor);
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
