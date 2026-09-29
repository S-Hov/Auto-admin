import { databaseRuntime } from "../../../../db/runtime/database.runtime";
import { createAuthRepository } from "../repository.factory";

export const getActiveAuthRepository = () => {
    const databaseProvider = databaseRuntime.getProvider();
    return createAuthRepository(databaseProvider.type, databaseProvider);
};
