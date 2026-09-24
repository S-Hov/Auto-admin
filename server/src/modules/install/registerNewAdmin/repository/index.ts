import { activeDatabaseProvider } from "../../../../db/runtime/database.runtime";
import { createRegisterAdminRepository } from "./repository.factory";

export type { RegisterAdminRepository } from "./repository.interface";
export { createRegisterAdminRepository } from "./repository.factory";

export const registerAdminRepository = createRegisterAdminRepository(
    activeDatabaseProvider.type,
    activeDatabaseProvider,
);
