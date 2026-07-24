import dotenv from "dotenv";
import fs from "fs/promises";
import path from 'path';
import { checkConnectionRepository, updateInstallationStatus } from "./install.repository";
import { getPool, resetPool } from "../../db";
import { DbConnectionData } from "./install.types";
import { badRequest, internal } from "../../shared/api/errors/error-helpers";
import { applyMigrationStep, getFirstMigrationStep, getMigrationsSteps, hasMigrationTable } from "../../migrations/utils";
import type { ApplyMigrationsStepResponse, DbCheckResponse, MigrationsStepsResponse } from "./install.types";
import { PagePaths } from "../../constants/pagePaths";

const envPath = path.join(process.cwd(), '.env');

export const checkConnectionService = async (data: DbConnectionData): Promise<DbCheckResponse> => {
    try {
        const version = await checkConnectionRepository(data);

        const databaseEnv = {
            Auto_Admin__DB_HOST: data.host,
            Auto_Admin__DB_PORT: String(data.port),
            Auto_Admin__DB_DATABASE: data.database,
            Auto_Admin__DB_USERNAME: data.user,
            Auto_Admin__DB_PASSWORD: data.password,
        };

        let currentContent = '';

        try {
            currentContent = await fs.readFile(envPath, 'utf8');
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw error;
            }
        }

        const currentEnv = dotenv.parse(currentContent);
        const updatedEnv = { ...currentEnv, ...databaseEnv };

        const updatedContent = Object.entries(updatedEnv)
            .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
            .join('\n') + '\n';

        const temporaryPath = `${envPath}.tmp`;

        await fs.writeFile(temporaryPath, updatedContent, {
            encoding: 'utf8',
            mode: 0o600,
        });

        await fs.rename(temporaryPath, envPath);

        Object.assign(process.env, databaseEnv);

        await resetPool();

        return { ...version, redirectedTo: PagePaths.login };

    } catch (error) {
        throw badRequest('Ошибка при проверке подключения к базе данных');
    }
}

export const getMigrationsStepsService = async (): Promise<MigrationsStepsResponse> => {
    try {
        const steps = await getMigrationsSteps();
        const nextStep = await getFirstMigrationStep();
        return { steps, nextStepUrl: nextStep };
    }
    catch (error) {
        throw internal('Ошибка при получении шагов миграции');
    }
}

export const ApplyMigrationsStepService = async (step: string): Promise<ApplyMigrationsStepResponse> => {
    await applyMigrationStep(step)

    const nextStepUrl = await getFirstMigrationStep()

    if (nextStepUrl === '') {
        await updateInstallationStatus(getPool(), 'migrated')
    }

    return { nextStepUrl }

}