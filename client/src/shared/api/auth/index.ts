import type { AuthSchemaFormValues } from '../../../features/auth-form/model/AuthForm.schema';
import { apiClient, type UnifiedResponse } from '../apiClient';
import type { Login } from './auth.types';

export const auth = {
    login(data: AuthSchemaFormValues){
        return apiClient<UnifiedResponse<Login>>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },
}