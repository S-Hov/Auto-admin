import type { PageField } from '@auto-admin/contracts/pages';
import { useTranslation } from 'react-i18next';

const numericString = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

function getWebUrl(value: string): URL | null {
    try {
        const url = new URL(value, window.location.origin);
        return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password
            ? url
            : null;
    } catch {
        return null;
    }
}

export function PageTableCell({ field, value }: { field: PageField; value: unknown }) {
    const { t, i18n } = useTranslation('pageTable');
    const locale = i18n.resolvedLanguage;
    const { display } = field;

    if (value == null || value === '') return '—';

    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);

    switch (display.type) {
        case 'number': {
            if (!(typeof value === 'number' && Number.isFinite(value)) &&
                !(typeof value === 'string' && numericString.test(value))) return text;

            const fractionDigits = display.fractionDigits;
            // Pass DECIMAL/BIGINT strings directly to Intl to preserve their precision.
            return new Intl.NumberFormat(locale, {
                minimumFractionDigits: fractionDigits,
                maximumFractionDigits: fractionDigits ?? 30,
            }).format(value as number | `${number}`);
        }
        case 'boolean':
            if (value === true || value === 1 || value === '1') return t('yes');
            if (value === false || value === 0 || value === '0') return t('no');
            return text;
        case 'date':
        case 'datetime': {
            if (typeof value !== 'string') return text;

            const isDateOnly = dateOnly.test(value);
            const date = new Date(value.replace(' ', 'T'));
            if (!Number.isFinite(date.getTime())) return text;

            return new Intl.DateTimeFormat(locale, {
                dateStyle: 'medium',
                timeStyle: display.type === 'datetime' ? 'medium' : undefined,
                timeZone: isDateOnly ? 'UTC' : undefined,
            }).format(date);
        }
        case 'image':
        case 'link': {
            const url = typeof value === 'string' && value.trim() ? getWebUrl(value) : null;
            if (!url) return text;

            return (
                <a href={url.href} target="_blank" rel="noreferrer">
                    {display.type === 'image' && url.origin === window.location.origin ? (
                        <img src={url.href} alt={field.label} loading="lazy" />
                    ) : text}
                </a>
            );
        }
        case 'text':
            return text;
    }
}
