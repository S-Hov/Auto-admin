import { HTTP_HEADERS } from '../../../../constants/headers';
import { STORAGE_KEYS } from '../../../../constants/storage';
import type { CreateAdminFormValues } from '../../../../features/create-admin/model/CreateAdmin.schema';
import { apiClient } from '../../apiClient';
import type { UnifiedResponse } from '../../types';
import type { CreateAdmin } from './auth.types';

export const auth = {
    register(data: CreateAdminFormValues){
        return apiClient<UnifiedResponse<CreateAdmin>>('/install/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                [HTTP_HEADERS.INSTALL_TOKEN]: sessionStorage.getItem(STORAGE_KEYS.INSTALL_TOKEN) || ''
            }
        })
    }
};