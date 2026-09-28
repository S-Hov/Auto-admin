import { activeDatabaseProvider } from "../../../db/runtime/database.runtime";
import { getQueryEngineProvider } from "../providers/provider.registry";

export const activeQueryEngineProvider = getQueryEngineProvider(
    activeDatabaseProvider.type,
);
