import { envConfig } from "../../config/env"
import { getDatabaseProvider } from "../providers/provider.registry";

export const activeDatabaseProvider = getDatabaseProvider(
    envConfig.Auto_Admin__DB_TYPE
);
