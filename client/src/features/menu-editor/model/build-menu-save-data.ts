import type { ManageableMenuItemDto, MenuSaveData } from '../../../shared/api/menu/menu.types';
import type { MenuItemPanelFormValues } from './MenuItemPanel.schema';

export interface NewMenuItemContext {
    parentId: number | null;
    parentName: string;
    sortOrder: number;
    isActive: boolean,
}

export function buildNewMenuItemContext(items: readonly ManageableMenuItemDto[], parentId: number | null): NewMenuItemContext {
    const parent = parentId === null ? null : items.find((item) => item.id === parentId);
    if (parentId !== null && !parent) throw new Error('Родительский пункт не найден');
    const siblings = items.filter((item) => item.parentId === parentId);
    const maxOrder = siblings.reduce((max, item) => Math.max(max, item.sortOrder), 0);
    return { parentId, parentName: parent?.name ?? 'Корневой уровень меню', sortOrder: Math.min(1_000_000, maxOrder + 10), isActive: true };
}

export function buildNewMenuSaveData(context: NewMenuItemContext, values: MenuItemPanelFormValues): MenuSaveData {
    return {
        parentId: context.parentId,
        name: values.name,
        slug: values.slug,
        icon: values.icon,
        iconType: 'icon',
        sortOrder: values.sortOrder,
        isActive: values.isActive,
    };
}

export function upsertSavedMenuItem(items: readonly ManageableMenuItemDto[], data: MenuSaveData, id: number): ManageableMenuItemDto[] {
    const { pageId, ...properties } = data;
    const saved = pageId === undefined ? { ...properties, id } : { ...properties, pageId, id };
    return items.some((item) => item.id === id)
        ? items.map((item) => item.id === id ? { ...item, ...saved } : item)
        : [...items, saved];
}

export function buildMenuSaveData(item: ManageableMenuItemDto, values: MenuItemPanelFormValues): MenuSaveData {
    return {
        id: item.id,
        parentId: item.parentId,
        name: values.name,
        slug: values.slug,
        icon: values.icon,
        // Старое изображение/видео не превращается в ключ иконки при смене названия.
        iconType: values.icon === item.icon ? item.iconType : 'icon',
        sortOrder: values.sortOrder,
        isActive: values.isActive,
    };
}
