export type DatabaseType = 'mysql' | 'sqlite' | 'postgres';

export type DatabaseSupportStatus = 'supported' | 'unsupported' | 'planned';

export interface DatabaseSubsystem {
    connection: boolean;
    systemRepositories: boolean;
    queryEngine: boolean;
    schemaCatalog: boolean;
    migrations: boolean;
    DatabaseDescriptor: boolean;
}

export interface Database {
    type: DatabaseType;
    disableName: string;
    defaultPool: number | null;
    status: DatabaseSupportStatus;
    support: DatabaseSubsystem;
}
