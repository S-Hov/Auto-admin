import { useParams } from 'react-router-dom';
import { isAppLocale, type AppLocale } from '../../../shared/i18n/config';

export function useAppLocale(): AppLocale {
  const { locale } = useParams<{ locale: string }>();

  if (!isAppLocale(locale)) {
    throw new Error('useAppLocale must be used inside a valid locale route');
  }
  return locale;
}