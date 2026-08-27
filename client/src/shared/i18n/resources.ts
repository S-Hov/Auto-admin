import { ruApi } from './locales/ru/api';
import { enApi } from './locales/en/api';

export const resources = {
    ru: {
        api: ruApi,
    },
    en: {
        api: enApi,
    },
} as const;