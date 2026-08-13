import dotenv from "dotenv";
import fs from "fs/promises";
import path from 'path';
import { markMigrationsCompleted } from "./install.repository";
import { getPool, resetPool } from "../../db";
import { badRequest, conflict, internal } from "../../shared/api/errors/error-helpers";
import { applyMigrationStep, getNextMigrationStep, getMigrationsSteps } from "../../migrations/utils";
import type { 
    ApplyMigrationsStepResponse,
    ApplyNextMigrationResponse,
    DbCheckResponse,
    MigrationPlanResponse,
    MigrationsStepsResponse,
    MigrationStepResponse
} from "./install.types";
import { PagePaths } from "../../constants/pagePaths";
import { checkConnection, type DbConnectionData } from "../../db/checkConnection";
import { applyNextMigration, getCurrentMigrationPlan } from "../../migrations/migration.runner";
import { MigrationLockUnavailableError, MigrationVersionConflictError } from "../../migrations/migration.errors";
import type { MigrationExecutionResult } from "../../migrations/migration.types";

const envPath = path.join(process.cwd(), '.env');

export const checkConnectionService = async (data: DbConnectionData): Promise<DbCheckResponse> => {
    try {
        const version = await checkConnection(data);

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
        const nextStep = await getNextMigrationStep();
        return { steps, nextStepUrl: nextStep };
    }
    catch (error) {
        throw internal('Ошибка при получении шагов миграции');
    }
}

export const ApplyMigrationsStepService = async (step: string): Promise<ApplyMigrationsStepResponse> => {
    await applyMigrationStep(step);

    const nextStepUrl = await getNextMigrationStep();

    if (nextStepUrl === '') {
        await markMigrationsCompleted(getPool());
    }

    return { nextStepUrl };
}

export const getMigrationPlanService = async (): Promise<MigrationPlanResponse> => {
    const plan = await getCurrentMigrationPlan();
    return {
        pending: plan.pending.map((migration) => {
            return {
                version: migration.version,
                name: migration.name,
                fileName: migration.fileName
            }
        }),
        nextVersion: plan.next?.version ?? null,
        isComplete: plan.isComplete
    }
}

export const applyNextMigrationService = async (expectedVersion: string): Promise<ApplyNextMigrationResponse> => {
    let applied: MigrationStepResponse | null = null;
    let result: MigrationExecutionResult;

    try {
        result = await applyNextMigration(expectedVersion);
        if (result.isComplete) await markMigrationsCompleted(getPool());
    }
    catch (error) {
        if (error instanceof MigrationLockUnavailableError) {
            throw conflict(error.message, undefined, 'INSTALL.MIGRATIONS_ALREADY_RUNNING');
        }
        if (error instanceof MigrationVersionConflictError) {
            throw conflict(
                error.message,
                {
                    expectedVersion: error.expectedVersion,
                    actualVersion: error.actualVersion
                },
                'INSTALL.MIGRATION_VERSION_CONFLICT'
            );
        }
        throw error;
    }

    if (result.applied !== null) {
        applied = {
            version: result.applied.version,
            name: result.applied.name,
            fileName: result.applied.fileName
        };
    }

    return {
        applied,
        nextVersion: result.next?.version ?? null,
        isComplete: result.isComplete
    };
}