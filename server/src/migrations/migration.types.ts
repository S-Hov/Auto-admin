export type MigrationDescriptor = {
    readonly version: string;
    readonly name: string;
    readonly fileName: string;
    readonly filePath: string;
    readonly checksum: string;
    readonly sql: string;
}