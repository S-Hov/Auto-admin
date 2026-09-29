import type { DatabaseType } from "../../../db/contracts/database.types";

export class QueryEngineProviderNotFoundError extends Error {
    constructor(public readonly type: DatabaseType) {
        super(`Query engine provider for ${type} not found.`);
        this.name = "QueryEngineProviderNotFoundError";
    }
}
