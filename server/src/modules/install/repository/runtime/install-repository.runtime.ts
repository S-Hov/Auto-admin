import { databaseRuntime } from "../../../../db/runtime/database.runtime";
import { createInstallRepository } from "../repository.factory";

export const getActiveInstallRepository = () => {
    const databaseProvider = databaseRuntime.getProvider();
    return createInstallRepository(databaseProvider.type, databaseProvider);
};
