import { activeDatabaseProvider } from "../../db/runtime/database.runtime";
import { getMigrationProvider } from "../providers/provider.registry";

export const activeMigrationProvider = getMigrationProvider(activeDatabaseProvider.type);
