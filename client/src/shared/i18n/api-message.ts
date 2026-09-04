import { ApiClientError } from "../api/ApiClientError";
import i18n from "i18next";
import type { TranslationParams } from "../api/types";

export function apiMessage(obj: unknown): string {
    if (obj instanceof ApiClientError) {
        const key = `api:${obj.code}`;

        return getMessage(key, obj.params);
    }

    if (obj && typeof obj === 'object') {
        const code = 'code' in obj && typeof obj.code === 'string' ? obj.code : null;
        const params = 'params' in obj && typeof obj.params === 'object' ? (obj.params as TranslationParams) : undefined;
        if (code) {
            const key = `api:${code}`;
            return getMessage(key, params);
        }
    }

    return i18n.t('api:COMMON.NETWORK_ERROR');
}

function getMessage(key: string, params?: TranslationParams): string {
    if (i18n.exists(key)) {
        return i18n.t(key, params);
    }

    return i18n.t('api:COMMON.UNKNOWN_ERROR');
}