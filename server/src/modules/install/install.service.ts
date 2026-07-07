import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import { checkConnectionRepository, hasMigrationsRepository } from "./install.repository";
import { resetPool } from "../../db";
import { DbConnectionData, registerData } from "./install.types";
import { badRequest } from "../../shared/api/errors/error-helpers";

export const checkConnectionService = async (data: DbConnectionData): Promise<{ version?: string }> => {
    try {
        const version = await checkConnectionRepository(data);

        const envContent = [
            `Auto_Admin__DB_HOST=${data.host}`,
            `Auto_Admin__DB_PORT=${data.port}`,
            `Auto_Admin__DB_DATABASE=${data.database}`,
            `Auto_Admin__DB_USERNAME=${data.user}`,
            `Auto_Admin__DB_PASSWORD=${data.password}`
        ].join('\n');

        const filePath = path.join(process.cwd(), '.Auto-Admin.env');

        await fs.writeFile(filePath, envContent, "utf8");

        Object.assign(process.env, dotenv.parse(envContent));
        
        await resetPool();

        return version;

    } catch (error) {
        throw badRequest('Ошибка при проверке подключения к базе данных');
    }
}

export const registerService = async (data: registerData): Promise<{ redirectedTo?: string }> => {
    try {
        return { redirectedTo: 'http://localhost:3000/login' }
    }
    catch (error) {
        throw badRequest('Ошибка при регистрации пользователя');
    }
}

export const getMigrationsFirstStepService = async (): Promise<{ redirectedTo?: string }> => {
    try {
        const migrationTable = await hasMigrationsRepository();
        if (migrationTable.length === 0) {
            return { redirectedTo: 'http://localhost:3000/install/migrations' }
        }

        return {};
    }
    catch (error) {
        throw badRequest('Ошибка при регистрации пользователя');
    }
}
