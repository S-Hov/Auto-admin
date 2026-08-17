export class MigrationLockUnavailableError extends Error {
    constructor() {
        super('Другой процесс уже выполняет миграции');
        this.name = 'MigrationLockUnavailableError';
    }
}

export class MigrationVersionConflictError extends Error {
    constructor(
        public readonly expectedVersion: string,
        public readonly actualVersion: string
    ) {
        super(`Клиент ожидал миграцию ${expectedVersion}, но следующая миграция на сервере - ${actualVersion}`);
        this.name = 'MigrationVersionConflictError';
    }
}

export class MigrationRecoveryRequiredError extends Error {
    constructor(
        public readonly version: string,
        public readonly status: 'running' | 'failed',
        public readonly errorMessage: string | null
    ) {
        super(`Миграция ${version} находится в состоянии ${status}.`);
        this.name = 'MigrationRecoveryRequiredError';
    }
}