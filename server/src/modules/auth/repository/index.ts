import { activeDatabaseProvider } from "../../../db/database.runtime";
import { createAuthRepository } from "./repository.factory";

export type { AuthRepository } from "./repository.interface";
export { createAuthRepository } from "./repository.factory";

export const authRepository = createAuthRepository(
    activeDatabaseProvider.type,
    activeDatabaseProvider,
);
