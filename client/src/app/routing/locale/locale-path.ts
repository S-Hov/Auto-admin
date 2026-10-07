import type { AppLocale } from "../../../shared/i18n/config";

const LOCALE_SEGMENT_PATTERN = /^[a-z]{2}$/i;

export function changePathLocale(pathname: string, locale: AppLocale): string {
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && LOCALE_SEGMENT_PATTERN.test(firstSegment)) {
    segments[0] = locale;
  }
  else {
    segments.unshift(locale);
  }

  return `/${segments.join('/')}`;
}