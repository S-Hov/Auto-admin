import type { CreateAdminFormValues } from '../../../../features/create-admin/model/CreateAdmin.schema';
import { apiClient, type UnifiedResponse } from '../../apiClient';
import type { CreateAdmin } from './auth.types';

export const auth = {
    register(data: CreateAdminFormValues){
        return apiClient<UnifiedResponse<CreateAdmin>>('/install/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'x-auto-admin-install-token': sessionStorage.getItem('x-install-token') || ''
            }
        })
    }
};