export const SUPPORTED_LOCALES = ['ru', 'en'] as const;

export type AppLocale = typeof SUPPORTED_LOCALES[number];

export const DEFAULT_LOCALE: AppLocale = 'ru';

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && SUPPORTED_LOCALES.includes(value as AppLocale);
}
