import { databaseRuntime } from "../../../db/runtime/database.runtime";
import { getSchemaCatalogProvider } from "../providers/provider.registry";

export const getActiveSchemaCatalogProvider = () =>
    getSchemaCatalogProvider(databaseRuntime.getType());
