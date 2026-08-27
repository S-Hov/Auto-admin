import { ApiClientError } from "../api/ApiClientError";
import i18n from "i18next";

export function apiMessage(error: unknown): string {
    if (error instanceof ApiClientError) {
        const key = `api:${error.code}`;
        
        if (i18n.exists(key)) {
            return i18n.t(key, error.params);
        }
        
        return i18n.t('api:COMMON.UNKNOWN_ERROR');
    }

    return i18n.t('api:COMMON.NETWORK_ERROR');
}