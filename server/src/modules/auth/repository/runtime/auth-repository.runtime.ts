import { activeDatabaseProvider } from "../../../../db/runtime/database.runtime";
import { createAuthRepository } from "../repository.factory";

export const activeAuthRepository = createAuthRepository(
    activeDatabaseProvider.type,
    activeDatabaseProvider,
);
