import { HTTP_HEADERS } from '../../../../constants/headers';
import { STORAGE_KEYS } from '../../../../constants/storage';
import type { CreateAdminFormValues } from '../../../../features/create-admin/model/CreateAdmin.schema';
import { apiClient } from '../../apiClient';
import { createAdminResponseSchema } from './auth.schema';

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
