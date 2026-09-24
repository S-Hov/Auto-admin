export const DATABASE_TYPES = ["mysql", "postgresql", "sqlite"] as const;

export type DatabaseType = typeof DATABASE_TYPES[number];

export type DatabaseSupportStatus = 'supported' | 'planned';

export type DatabaseSubsystem = 'connection' | 'systemRepositories' | 'queryEngine' | 'schemaCatalog' | 'migrations';

export interface DatabaseDescriptor {
    type: DatabaseType;
    displayName: string;
    defaultPort: number | null;
    status: DatabaseSupportStatus;
    support: Readonly<Record<DatabaseSubsystem, boolean>>;
}
