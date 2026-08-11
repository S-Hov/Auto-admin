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