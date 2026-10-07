import { ruApi } from './locales/ru/api';
import { enApi } from './locales/en/api';
import authFormRu from '../../features/auth-form/i18n/ru.json';
import authFormEn from '../../features/auth-form/i18n/en.json';
import loginPageRu from '../../pages/login/i18n/ru.json';
import loginPageEn from '../../pages/login/i18n/en.json';


export const resources = {
    ru: {
        api: ruApi,
        authForm: authFormRu,
        loginPage: loginPageRu,
    },
    en: {
        api: enApi,
        authForm: authFormEn,
        loginPage: loginPageEn,
    },
} as const;