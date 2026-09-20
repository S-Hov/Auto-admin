export type DatabaseType = 'mysql' | 'sqlite' | 'postgresql';

export type DatabaseSupportStatus = 'supported' | 'planned';

export type DatabaseSubsystem = 'connection' | 'systemRepositories' | 'queryEngine' | 'schemaCatalog' | 'migrations';

export interface DatabaseDescriptor {
    type: DatabaseType;
    displayName: string;
    defaultPort: number | null;
    status: DatabaseSupportStatus;
    support: Readonly<Record<DatabaseSubsystem, boolean>>;
}

export const DATABASE_TYPES: Readonly<DatabaseType[]> = ['mysql', 'sqlite', 'postgresql'];
