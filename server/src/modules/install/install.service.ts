import { checkConnectionRepository } from "./install.repository";
import { DbConnectionData } from "./install.types";

export const checkConnectionService = async (data: DbConnectionData): Promise<{ version?: string }> => {
    return await checkConnectionRepository(data);
}