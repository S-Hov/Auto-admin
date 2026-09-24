import { activeDatabaseProvider } from "../../../db/runtime/database.runtime";
import { createInstallRepository } from "./repository.factory";

export type { InstallRepository } from "./repository.interface";
export { createInstallRepository } from "./repository.factory";

export const installRepository = createInstallRepository(
    activeDatabaseProvider.type,
    activeDatabaseProvider,
);
