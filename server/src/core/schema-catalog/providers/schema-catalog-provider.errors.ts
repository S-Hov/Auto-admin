import type { DatabaseType } from "@auto-admin/contracts/database";

export class SchemaCatalogProviderNotFoundError extends Error {
    constructor(public readonly type: DatabaseType) {
        super(`Schema catalog provider for ${type} not found.`);
        this.name = "SchemaCatalogProviderNotFoundError";
    }
}
