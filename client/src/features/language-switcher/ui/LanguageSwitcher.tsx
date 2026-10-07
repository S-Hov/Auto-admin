import { useLocation, useNavigate } from "react-router-dom";
import { useAppLocale } from "../../../app/routing/locale/use-app-locale";
import { SUPPORTED_LOCALES, type AppLocale } from "../../../shared/i18n/config";
import { changePathLocale } from "../../../app/routing/locale/locale-path";





const LABELS: Record<AppLocale, string> = {
  ru: 'RU',
  en: 'EN',
};

export const LanguageSwitcher = () => {
  const currentLocale = useAppLocale();
  const location = useLocation();
  const navigate = useNavigate();

  const selectLocale = (nextLocale: AppLocale) => {
    if (nextLocale === currentLocale) return;

    navigate(
      {
        pathname: changePathLocale(location.pathname, nextLocale),
        search: location.search,
        hash: location.hash,
      },
      { replace: true },
    );
  };

  return (
    <div role="group" aria-label="Language">
      {SUPPORTED_LOCALES.map((locale) => (
      <button
        key={locale}
        type="button"
        aria-pressed={locale === currentLocale}
        onClick={() => selectLocale(locale)}
        >
        {LABELS[locale]}
        </button>
      ))}
    </div>
  );
};