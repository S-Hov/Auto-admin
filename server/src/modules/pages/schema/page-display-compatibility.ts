import type { DeepReadonly, StoredField } from '../../../core/schema-catalog';
import type { PageFieldDisplay } from './page-config.schema';

const numericTypes = new Set([
    'tinyint', 'smallint', 'mediumint', 'int', 'integer', 'bigint',
    'decimal', 'numeric', 'float', 'double', 'double precision', 'real',
    'int2', 'int4', 'int8',
]);
const stringTypes = new Set([
    'char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext',
    'character', 'character varying', 'enum', 'set', 'uuid',
]);
const datetimeTypes = new Set([
    'datetime', 'timestamp', 'timestamptz',
    'timestamp with time zone', 'timestamp without time zone',
]);
const booleanTypes = new Set(['bool', 'boolean']);
const textOnlyTypes = new Set(['time', 'timetz', 'time with time zone', 'time without time zone', 'year']);

/** Совместимость типов, не конвертация значений. Неизвестные типы не разрешаем автоматически. */
export function isPageDisplayCompatible(
    display: PageFieldDisplay,
    field: DeepReadonly<StoredField>,
): boolean {
    const type = field.dataType.trim().toLowerCase();
    // MySQL хранит BOOLEAN как TINYINT(1). Любой INT/BIT не считаем логическим полем.
    // Renderer обязан обрабатывать 0/1 явно, а не превращать произвольное значение в Boolean.
    const isBoolean = booleanTypes.has(type) ||
        (type === 'tinyint' && /^tinyint\s*\(\s*1\s*\)(?:\s+unsigned)?(?:\s+zerofill)?$/i.test(field.columnType.trim()));

    switch (display.type) {
        case 'text':
            return stringTypes.has(type) || numericTypes.has(type) || isBoolean ||
                type === 'date' || datetimeTypes.has(type) || textOnlyTypes.has(type);
        case 'number': return numericTypes.has(type);
        case 'boolean': return isBoolean;
        case 'date': return type === 'date' || datetimeTypes.has(type);
        case 'datetime': return datetimeTypes.has(type);
        case 'image':
        case 'link': return stringTypes.has(type);
    }
}
