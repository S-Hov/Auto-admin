import { UnsupportedDatabaseError, UnsupportedDatabaseSubsystemError } from "./database.errors";
import type { DatabaseDescriptor, DatabaseSubsystem, DatabaseType } from "./database.types";

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

export const getDatabaseDescriptor = (type: DatabaseType): DatabaseDescriptor => {
    const descriptor = DATABASE_CATALOG[type];
    if (!descriptor) {
        throw new UnsupportedDatabaseError(type);
    }
    return descriptor;
};

export const assertDatabaseSupported = (type: DatabaseType): DatabaseDescriptor => {
    const descriptor = getDatabaseDescriptor(type);
    if (descriptor.status !== 'supported') {
        throw new UnsupportedDatabaseError(type);
    }
    return descriptor;
}

export const assertDatabaseSubsystemSupported = (type: DatabaseType, subsystem: DatabaseSubsystem): DatabaseDescriptor => {
    const descriptor = assertDatabaseSupported(type);
    if (!descriptor.support[subsystem]) throw new UnsupportedDatabaseSubsystemError(type, subsystem);
    return descriptor;
}

export const getSupportedDatabases = (): DatabaseDescriptor[] => {
    return Object.values(DATABASE_CATALOG).filter((descriptor) => descriptor.status === 'supported');
};
