import { apiClient } from '../apiClient';
import { visibleMenuResponseSchema, manageableMenuResponseSchema } from './menu.schema';

export const menu = {
    getMenu() {
        return apiClient('/menu', visibleMenuResponseSchema, {
            method: 'GET',
        });
    },
    getManageableMenu() {
        return apiClient('/menu/manage', manageableMenuResponseSchema, {
            method: 'GET',
        });
    }
};