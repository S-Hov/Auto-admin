export type SchemaCatalogErrorCode =
    | 'SCHEMA.CATALOG_NOT_READY'
    | 'SCHEMA.SCAN_ALREADY_RUNNING'
    | 'SCHEMA.SCAN_FAILED';

export class SchemaCatalogError extends Error {
    constructor(
        message: string,
        public readonly code: SchemaCatalogErrorCode,
        options?: ErrorOptions,
    ) {
        super(message, options);
        this.name = 'SchemaCatalogError';
    }
}

export class SchemaCatalogNotReadyError extends SchemaCatalogError {
    constructor() {
        super('Schema catalog has not been scanned yet', 'SCHEMA.CATALOG_NOT_READY');
        this.name = 'SchemaCatalogNotReadyError';
    }
}

export class SchemaCatalogScanInProgressError extends SchemaCatalogError {
    constructor() {
        super('Another schema catalog scan is already running', 'SCHEMA.SCAN_ALREADY_RUNNING');
        this.name = 'SchemaCatalogScanInProgressError';
    }
}
