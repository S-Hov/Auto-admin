import { envConfig } from "../../config/env";
import type { DatabaseType } from "../contracts/database.types";
import type { DatabaseProvider } from "../contracts/provider.interface";
import { DatabaseProviderNotConfiguredError } from "../errors/database.errors";
import { getDatabaseProvider } from "../providers/provider.registry";

export class DatabaseRuntime {
    private dbType: DatabaseType | undefined;
    private provider: DatabaseProvider | undefined;

    constructor() {
        this.dbType = envConfig.Auto_Admin__DB_TYPE;
        if (this.dbType) this.provider = getDatabaseProvider(this.dbType);
    }

    isConfigured(): boolean {
        return this.provider !== undefined;
    }

    getType(): DatabaseType {
        if (!this.dbType) throw new DatabaseProviderNotConfiguredError();
        return this.dbType;
    }

    getProvider(): DatabaseProvider {
        if (!this.provider) throw new DatabaseProviderNotConfiguredError();
        return this.provider;
    }

    async configure(type: DatabaseType): Promise<void> {
        const nextProvider = getDatabaseProvider(type);

        if (this.provider === nextProvider) {
            this.dbType = type;
            return;
        }

        await this.provider?.close();
        this.dbType = type;
        this.provider = nextProvider;
    }

    async close(): Promise<void> {
        await this.provider?.close();
    }
}

export const databaseRuntime = new DatabaseRuntime();
