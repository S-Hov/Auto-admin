import type { DatabaseExecutor } from "../../../../db/contracts/executor.interface";
import type { AccessControlProvider } from "../../contracts/access-control-provider.interface";
import type { AccessControlRepository } from "../../contracts/access-control-repository.interface";
import { MySqlAccessControlRepository } from "./mysql-access-control.repository";

export class MySqlAccessControlProvider implements AccessControlProvider<"mysql"> {
    readonly type = "mysql";

    createRepository(executor: DatabaseExecutor): AccessControlRepository {
        return new MySqlAccessControlRepository(executor);
    }
}

export const mySqlAccessControlProvider = new MySqlAccessControlProvider();
