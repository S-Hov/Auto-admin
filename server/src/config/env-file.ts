import { randomUUID } from "crypto";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { AsyncMutex } from "../shared/concurrency/AsyncMutex";

const envPath = path.join(process.cwd(), ".env");
const envFileMutex = new AsyncMutex();

export const updateEnvironment = async (
    values: Readonly<Record<string, string>>,
): Promise<void> => {
    const release = await envFileMutex.acquire();
    let temporaryPath: string | null = null;

    try {
        let currentContent = "";

        try {
            currentContent = await fs.readFile(envPath, "utf8");
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
                throw error;
            }
        }

        const updatedEnvironment = {
            ...dotenv.parse(currentContent),
            ...values,
        };
        const updatedContent =
            Object.entries(updatedEnvironment)
                .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
                .join("\n") + "\n";

        temporaryPath = `${envPath}.${Date.now()}.${randomUUID()}.tmp`;
        await fs.writeFile(temporaryPath, updatedContent, {
            encoding: "utf8",
            mode: 0o600,
        });
        await fs.rename(temporaryPath, envPath);
        temporaryPath = null;

        Object.assign(process.env, values);
    } finally {
        if (temporaryPath) {
            await fs.unlink(temporaryPath).catch(() => undefined);
        }
        release();
    }
};
