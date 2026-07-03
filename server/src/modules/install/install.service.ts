import { checkConnectionRepository } from "./install.repository";
import { DbConnectionData } from "./install.types";
import { badRequest } from "../../shared/api/errors/error-helpers";

export const checkConnectionService = async (data: DbConnectionData): Promise<{ version?: string }> => {
    try {
        return await checkConnectionRepository(data);
    }catch (error) {
        throw badRequest('Ошибка при проверке подключения к базе данных');
    }
}