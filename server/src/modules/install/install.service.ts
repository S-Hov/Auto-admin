import fs from "fs/promises";
import path from "path";
import { checkConnectionRepository } from "./install.repository";
import { DbConnectionData, registerData } from "./install.types";
import { badRequest } from "../../shared/api/errors/error-helpers";

export const checkConnectionService = async (data: DbConnectionData): Promise<{ version?: string }> => {
    try {
        const version = await checkConnectionRepository(data);

        const envContent = [
            `Auto-Admin_DB_HOST=${data.host}`,
            `Auto-Admin_DB_PORT=${data.port}`,
            `Auto-Admin_DB_DATABASE=${data.database}`,
            `Auto-Admin_DB_USERNAME=${data.user}`,
            `Auto-Admin_DB_PASSWORD=${data.password}`
        ].join('\n');

        const filePath = path.join(process.cwd(), '.Auto-Admin.env');

        await fs.writeFile(filePath, envContent, "utf8");

        return version;

    }catch (error) {
        throw badRequest('Ошибка при проверке подключения к базе данных');
    }
}

export const registerService = async (data: registerData): Promise<{ redirectedTo?: string }> => {
    try {
        return {redirectedTo: 'http://localhost:3000/login'}
    }
    catch (error) {
        throw badRequest('Ошибка при регистрации пользователя');
    }
}