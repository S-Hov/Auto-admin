import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './config';
import { resources } from './resources';

void i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: DEFAULT_LOCALE,
        fallbackLng: DEFAULT_LOCALE,
        supportedLngs: SUPPORTED_LOCALES,
        defaultNS: 'api',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;