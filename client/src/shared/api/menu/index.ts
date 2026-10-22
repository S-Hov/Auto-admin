import { apiClient, ApiContractError } from '../apiClient';
import { visibleMenuResponseSchema, manageableMenuResponseSchema, menuSaveDataSchema, menuSaveResponseSchema, menuDeleteIdSchema, menuDeleteResponseSchema } from './menu.schema';
import type { MenuSaveData } from './menu.types';

async function saveMenu(data: MenuSaveData) {
    const payload = menuSaveDataSchema.parse(data);
    const response = await apiClient('/menu', menuSaveResponseSchema, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    if (payload.id !== undefined && response.data.id !== payload.id) throw new ApiContractError(200);
    return response;
}

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
    },
    saveMenu,
    async deleteMenu(id: number) {
        const validId = menuDeleteIdSchema.parse(id);
        return apiClient(`/menu/${validId}`, menuDeleteResponseSchema, { method: 'DELETE' });
    },
    // Endpoint создаёт пункт без id и обновляет существующий при наличии id.
    createMenu: saveMenu,
};
