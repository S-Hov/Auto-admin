import { envConfig } from "../config/env"
import { getDatabaseProvider } from "./database-provider.registry";

export const activeDatabaseProvider = () => {
    const activeDatabase = envConfig.Auto_Admin__DB_TYPE;
    const provider = getDatabaseProvider(activeDatabase);

    return provider;
}