import type { ManageableMenuItemDto } from "../../../shared/api/menu/menu.types";

export const getMenuSubtreeIds = (
    items: readonly ManageableMenuItemDto[],
    id: number,
): Set<number> => {
    if (!items.some((item) => item.id === id)) {
        throw new Error(`Пункт меню с ID ${id} не найден`);
    }

    const childrenByParent = new Map<number, number[]>();
    for (const item of items) {
        if (item.parentId === null) continue;

        let children = childrenByParent.get(item.parentId);
        if (!children) {
            children = [];
            childrenByParent.set(item.parentId, children);
        }
        children.push(item.id);
    }

    const result = new Set<number>();
    const pending: number[] = [id];

    while (pending.length > 0) {
        const currentId = pending.pop();
        if (currentId === undefined || result.has(currentId)) continue;

        result.add(currentId);
        for (const childId of childrenByParent.get(currentId) ?? []) {
            pending.push(childId);
        }
    }

    return result;
};
