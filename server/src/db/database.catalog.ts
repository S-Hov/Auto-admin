import type { DatabaseDescriptor, DatabaseType } from "./database.types";

export const DATABASE_CATALOG = {
    'mysql': {
        type: 'mysql',
        displayName: 'MySQL',
        defaultPort: 3306,
        status: 'supported',
        support: {
            connection: true,
            systemRepositories: true,
            queryEngine: true,
            schemaCatalog: true,
            migrations: true,
        },
    },
    'postgresql': {
        type: 'postgresql',
        displayName: 'PostgreSQL',
        defaultPort: 5432,
        status: 'planned',
        support: {
            connection: false,
            systemRepositories: false,
            queryEngine: false,
            schemaCatalog: false,
            migrations: false,
        },
    },
    'sqlite': {
        type: 'sqlite',
        displayName: 'SQLite',
        defaultPort: null,
        status: 'planned',
        support: {
            connection: false,
            systemRepositories: false,
            queryEngine: false,
            schemaCatalog: false,
            migrations: false,
        },
    },
} as const satisfies Readonly<Record<DatabaseType, DatabaseDescriptor>>;