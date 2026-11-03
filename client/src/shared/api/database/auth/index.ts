import { HTTP_HEADERS } from '../../../../constants/headers';
import { STORAGE_KEYS } from '../../../../constants/storage';
import { type RegisterData as CreateAdminFormValues, createAdminResponseSchema } from "@auto-admin/contracts/install";
import { apiClient } from '../../apiClient';

export const auth = {
    register(data: CreateAdminFormValues){
        return apiClient('/install/auth/register', createAdminResponseSchema, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                [HTTP_HEADERS.INSTALL_TOKEN]: sessionStorage.getItem(STORAGE_KEYS.INSTALL_TOKEN) || ''
            }
        })
    }
};
