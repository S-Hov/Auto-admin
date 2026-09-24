import { envConfig } from "../config/env"
import { getDatabaseProvider } from "./database-provider.registry";

export const activeDatabaseProvider = getDatabaseProvider(
    envConfig.Auto_Admin__DB_TYPE
);