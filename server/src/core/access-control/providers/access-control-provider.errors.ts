import type { DatabaseType } from "../../../db/contracts/database.types";

export class AccessControlProviderNotFoundError extends Error {
    constructor(public readonly type: DatabaseType) {
        super(`Access control provider for ${type} not found.`);
        this.name = "AccessControlProviderNotFoundError";
    }
}
