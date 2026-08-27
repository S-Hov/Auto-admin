import { ApiClientError } from "../api/ApiClientError";
import i18n from "i18next";


export function apiMessage(error: unknown): string {
    if (error instanceof ApiClientError){
        if (i18n.exists(`api.${error.code}`)){
            return i18n.t(`api.${error.code}`, error.params);
        }
        else {
            return i18n.t(`api.COMMON.UNKNOWN_ERROR`)
        }
    } else {
        return i18n.t(`api.COMMON.NETWORK_ERROR`)
    }
}