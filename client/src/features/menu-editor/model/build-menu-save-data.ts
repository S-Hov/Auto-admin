import type { ManageableMenuItemDto, MenuSaveData } from '../../../shared/api/menu/menu.types';
import type { MenuItemPanelFormValues } from './MenuItemPanel.schema';

export function buildMenuSaveData(item: ManageableMenuItemDto, values: MenuItemPanelFormValues): MenuSaveData {
    return {
        id: item.id,
        parentId: item.parentId,
        name: values.name,
        slug: values.slug,
        icon: values.icon,
        // Старое изображение/видео не превращается в ключ иконки при смене названия.
        iconType: values.icon === item.icon ? item.iconType : 'icon',
        sortOrder: item.sortOrder,
        isActive: item.isActive,
    };
}
