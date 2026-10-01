import type { DatabaseExecutor } from "../../../db/contracts/executor.interface";
import type { DatabaseType } from "../../../db/contracts/database.types";
import { MySqlMenuRepository } from "./mysql/mysql-menu.repository";
import { ERROR_CODES } from "../../../shared/api/codes/error-codes";
import { badRequest } from "../../../shared/api/errors/error-helpers";

export function createMenuRepository(
    type: DatabaseType,
    executor: DatabaseExecutor,
) {
    if (type === "mysql") return new MySqlMenuRepository(executor);
    throw badRequest(ERROR_CODES.UNSUPPORTED_DATABASE_SUBSYSTEM, {
        params: { subsystem: "menu" },
    });
}
