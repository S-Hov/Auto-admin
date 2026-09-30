import { databaseRuntime } from "../../../db/runtime/database.runtime";
import { getAccessControlProvider } from "../providers/provider.registry";

export const getActiveAccessControlProvider = () =>
    getAccessControlProvider(databaseRuntime.getType());
