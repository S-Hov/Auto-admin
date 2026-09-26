import type { DatabaseType } from "../../../db/contracts/database.types";

export class SchemaCatalogProviderNotFoundError extends Error {
    constructor(public readonly type: DatabaseType) {
        super(`Schema catalog provider for ${type} not found.`);
        this.name = "SchemaCatalogProviderNotFoundError";
    }
}
