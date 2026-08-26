import dotenv from "dotenv";
import fs from "fs/promises";
import path from 'path';
import { markMigrationsCompleted } from "./install.repository";
import { getPool, resetPool } from "../../db";
import { badRequest, conflict } from "../../shared/api/errors/error-helpers";
import type {
    ApplyNextMigrationResponse,
    DbCheckResponse,
    MigrationPlanResponse,
    MigrationStepResponse
} from "./install.types";
import { PagePaths } from "../../constants/pagePaths";
import { checkConnection, type DbConnectionData } from "../../db/checkConnection";
import { applyNextMigration, getCurrentMigrationPlan } from "../../migrations/migration.runner";
import { MigrationLockUnavailableError, MigrationVersionConflictError } from "../../migrations/migration.errors";
import type { MigrationExecutionResult } from "../../migrations/migration.types";
import { randomUUID } from "crypto";
import { ERROR_CODES } from "../../shared/api/codes/error-codes";

const envPath = path.join(process.cwd(), '.env');

export const checkConnectionService = async (data: DbConnectionData): Promise<DbCheckResponse> => {
    let versionInfo: { version?: string };

    try {
        versionInfo = await checkConnection(data);
    } catch (error) {
        throw badRequest(ERROR_CODES.INSTALL_DATABASE_CONNECTION_FAILED);
    }
    
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

    const temporaryPath = `${envPath}.${Date.now()}.${randomUUID()}.tmp`;

    await fs.writeFile(temporaryPath, updatedContent, {
        encoding: 'utf8',
        mode: 0o600,
    });

    await fs.rename(temporaryPath, envPath);

    Object.assign(process.env, databaseEnv);

    await resetPool();

    return { ...versionInfo, redirectedTo: PagePaths.login };
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
            throw conflict(ERROR_CODES.INSTALL_MIGRATIONS_ALREADY_RUNNING);
        }
        if (error instanceof MigrationVersionConflictError) {
            throw conflict(
                ERROR_CODES.INSTALL_MIGRATION_VERSION_CONFLICT,
                { params: { expectedVersion: error.expectedVersion, actualVersion: error.actualVersion } }
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