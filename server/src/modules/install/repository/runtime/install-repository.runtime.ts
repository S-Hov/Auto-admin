import { activeDatabaseProvider } from "../../../../db/runtime/database.runtime";
import { createInstallRepository } from "../repository.factory";

export const activeInstallRepository = createInstallRepository(
    activeDatabaseProvider.type,
    activeDatabaseProvider,
);
