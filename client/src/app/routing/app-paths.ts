import type { AppLocale } from '../../shared/i18n/config';

export const appPaths = {
  home: (locale: AppLocale) => `/${locale}`,
  login: (locale: AppLocale) => `/${locale}/auth/login`,
  install: (locale: AppLocale) => `/${locale}/install`,
  runMigrations: (locale: AppLocale) => `/${locale}/install/runMigrations`,
  migrationRecovery: (locale: AppLocale) => `/${locale}/install/migrationRecovery`,
  registerAdmin: (locale: AppLocale) => `/${locale}/install/register`,
  users: (locale: AppLocale) => `/${locale}/users`,
} as const;