import { databaseRuntime } from "../../../../db/runtime/database.runtime";
import { createPageRepository } from "../repository.factory";

export const getActivePageRepository = () => {
    const databaseProvider = databaseRuntime.getProvider();
    return createPageRepository(databaseProvider.type, databaseProvider);
};
