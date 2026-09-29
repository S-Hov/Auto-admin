import { databaseRuntime } from "../../db/runtime/database.runtime";
import { getMigrationProvider } from "../providers/provider.registry";

export const getActiveMigrationProvider = () =>
    getMigrationProvider(databaseRuntime.getType());
