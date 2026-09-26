import { activeDatabaseProvider } from "../../../db/runtime/database.runtime";
import { getSchemaCatalogProvider } from "../providers/provider.registry";

export const activeSchemaCatalogProvider = getSchemaCatalogProvider(
    activeDatabaseProvider.type,
);
