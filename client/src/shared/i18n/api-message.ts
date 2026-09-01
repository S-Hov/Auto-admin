import { ApiClientError } from "../api/ApiClientError";
import i18n from "i18next";
import type { TranslationParams, UnifiedResponse } from "../api/types";

export function apiMessage(obj: unknown): string {
    if (obj instanceof ApiClientError) {
        const key = `api:${obj.code}`;

        return getMessage(key, obj.params);
    }

    if (typeof obj === 'object' && obj && Object.prototype.hasOwnProperty.call(obj, 'code')) {
        const { code, params } = obj as UnifiedResponse;
        const key = `api:${code}`;

        return getMessage(key, params);
    }

    return i18n.t('api:COMMON.NETWORK_ERROR');
}

function getMessage(key: string, params?: TranslationParams): string {
    if (i18n.exists(key)) {
        return i18n.t(key, params);
    }

    return i18n.t('api:COMMON.UNKNOWN_ERROR');
}