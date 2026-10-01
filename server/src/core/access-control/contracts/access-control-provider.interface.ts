import type { DatabaseType } from "../../../db/contracts/database.types";
import type { DatabaseExecutor } from "../../../db/contracts/executor.interface";
import type { AccessControlRepository } from "./access-control-repository.interface";

export interface AccessControlProvider<
    TDatabaseType extends DatabaseType = DatabaseType,
> {
    readonly type: TDatabaseType;

    createRepository(executor: DatabaseExecutor): AccessControlRepository;
}
