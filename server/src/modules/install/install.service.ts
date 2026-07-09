import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import { checkConnectionRepository } from "./install.repository";
import { resetPool } from "../../db";
import { DbConnectionData, RegisterData } from "./install.types";
import { badRequest } from "../../shared/api/errors/error-helpers";
import { createMigrationTable, getFirstMigrationStep, getMigrationsSteps, hasMigrationTable } from "../../migrations/utils";
import type { DbCheckResponse, MigrationsStepsResponse } from "./install.types";

export const checkConnectionService = async (data: DbConnectionData): Promise<DbCheckResponse> => {
    const redirectedTo = '/install/runMigrations';

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

        return {...version, redirectedTo};

    } catch (error) {
        throw badRequest('Ошибка при проверке подключения к базе данных');
    }
}

export const registerService = async (data: RegisterData): Promise<{ redirectedTo?: string }> => {
    try {
        return { redirectedTo: 'http://localhost:3000/login' }
    }
    catch (error) {
        throw badRequest('Ошибка при регистрации пользователя');
    }
}

export const getMigrationsFirstStepService = async (): Promise<{ redirectedTo?: string }> => {
    try {
        const migrationTable = await hasMigrationTable();
        if (!migrationTable) {
            try {
                await createMigrationTable();
                return { redirectedTo: '/install/migrations/1' }
            } catch (error) {
                throw badRequest('Ошибка при создании таблицы миграций');
            }
        }
        else {
            return { redirectedTo: '/install/migrations/2' }
        }
    }
    catch (error) {
        throw badRequest('Ошибка при регистрации пользователя');
    }
}

export const getMigrationsStepsService = async (): Promise<MigrationsStepsResponse> => {
    try {
        const steps = await getMigrationsSteps();
        const nextStep = await getFirstMigrationStep();
        return { steps, nextStepUrl: nextStep };
    }
    catch (error) {
        throw badRequest('Ошибка при получении шагов миграции');
    }
}

