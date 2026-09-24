// Temporary compatibility facade for modules that have not yet migrated to
// DatabaseProvider and DatabaseExecutor. New code must not depend on this API.
export {
    getEnvConnectionParams,
    getPool,
    resetPool,
    withTransaction,
} from "./legacy/mysql";
export type { DbExecutor } from "./legacy/mysql";
