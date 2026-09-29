import { databaseRuntime } from "../../../db/runtime/database.runtime";
import { getQueryEngineProvider } from "../providers/provider.registry";

export const getActiveQueryEngineProvider = () =>
    getQueryEngineProvider(databaseRuntime.getType());
