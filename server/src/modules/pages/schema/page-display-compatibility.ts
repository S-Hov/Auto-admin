import type { PageFieldDisplay } from '@auto-admin/contracts/pages';
import type { DeepReadonly, StoredField } from '../../../core/schema-catalog';
import { isNumericFieldType, isTextFieldType } from '../../../core/schema-catalog/types/field-type-category';

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
            return isTextFieldType(field.dataType) || isNumericFieldType(field.dataType) || isBoolean ||
                type === 'date' || datetimeTypes.has(type) || textOnlyTypes.has(type);
        case 'number': return isNumericFieldType(field.dataType);
        case 'boolean': return isBoolean;
        case 'date': return type === 'date' || datetimeTypes.has(type);
        case 'datetime': return datetimeTypes.has(type);
        case 'image':
        case 'link': return isTextFieldType(field.dataType);
    }
}
