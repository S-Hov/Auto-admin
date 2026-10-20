import type {
    ManageableMenuItemDto,
    MenuSaveData,
} from "../../../shared/api/menu/menu.types";
import { getMenuSubtreeIds } from "./get-menu-subtree-ids";

export const buildMenuMoveData = (
    items: readonly ManageableMenuItemDto[],
    rootId: number,
    targetId: "virtual-root" | number | null,
): MenuSaveData | null => {
    const root = items.find((item) => item.id === rootId);
    if (!root) {
        throw new Error(`Пункт меню с ID ${rootId} не найден`);
    }
    if (targetId === null) return null;
    if (
        typeof targetId === "number" &&
        !items.some((item) => item.id === targetId)
    ) {
        throw new Error(`Пункт меню с ID ${targetId} не найден`);
    }
    const parentId = targetId === "virtual-root" ? null : targetId;

    if (rootId === parentId || root.parentId === parentId) return null;

    const subtree = getMenuSubtreeIds(items, rootId);
    if (typeof parentId === "number" && subtree.has(parentId)) {
        throw new Error("Нельзя перенести пункт меню в собственное поддерево");
    }

    const targetChildrenOrders = items
        .filter((item) => item.parentId === parentId && !subtree.has(item.id))
        .map((item) => item.sortOrder);

    const maxOrder =
        targetChildrenOrders.length > 0 ? Math.max(...targetChildrenOrders) : 0;

    if (maxOrder + 1 > 1000000) throw new Error("Достигнут передел порядка. Максимальный порядок: 1 000 000")

    return {
        id: rootId,
        parentId,
        name: root.name,
        slug: root.slug,
        icon: root.icon,
        iconType: root.iconType,
        isActive: root.isActive,
        sortOrder: maxOrder + 1,
    };
};
