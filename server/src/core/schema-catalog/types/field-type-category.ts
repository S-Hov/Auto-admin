const numericTypes = new Set([
    'tinyint', 'smallint', 'mediumint', 'int', 'integer', 'bigint',
    'decimal', 'numeric', 'float', 'double', 'double precision', 'real',
    'int2', 'int4', 'int8',
]);
const stringTypes = new Set([
    'char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext',
    'character', 'character varying', 'enum', 'set', 'uuid',
]);

export function isTextFieldType(dataType: string): boolean {
    const type = dataType.trim().toLowerCase();
    return stringTypes.has(type);
}

export function isNumericFieldType(dataType: string): boolean {
    const type = dataType.trim().toLowerCase();
    return numericTypes.has(type);
}