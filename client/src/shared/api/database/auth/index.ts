import type { CreateAdminFormValues } from '../../../../features/create-admin/model/CreateAdmin.schema';
import { apiClient, type UnifiedResponse } from '../../apiClient';
import type { CreateAdmin } from './auth.types';

export const auth = {
    register(data: CreateAdminFormValues){
        return apiClient<UnifiedResponse<CreateAdmin>>('/install/register', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    }
};