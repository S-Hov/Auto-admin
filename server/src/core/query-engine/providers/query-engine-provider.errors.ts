import type { DatabaseType } from "@auto-admin/contracts/database";

export class QueryEngineProviderNotFoundError extends Error {
    constructor(public readonly type: DatabaseType) {
        super(`Query engine provider for ${type} not found.`);
        this.name = "QueryEngineProviderNotFoundError";
    }
}
