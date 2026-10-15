import type { ManageableMenuItemDto } from "../../../shared/api/menu/menu.types";
import type { EditableMenuItemDto, EditableVirtualMenuItem } from "./menu-editor-tree.types";

export const buildEditorTree = (items: readonly ManageableMenuItemDto[]): EditableVirtualMenuItem => {
    const nodes = new Map<number, EditableMenuItemDto>();
    for (const item of items) {
        if (nodes.has(item.id)) throw new Error('Повторяющийся идентификатор пункта меню');
        nodes.set(item.id, { ...item, children: [], kind: "item" });
    }

    const roots: EditableMenuItemDto[] = [];
    for (const node of nodes.values()) {
        const visited = new Set<number>();
        let current: EditableMenuItemDto | undefined = node;
        while (current) {
            if (visited.has(current.id)) throw new Error('Циклическая структура меню');
            visited.add(current.id);
            if (current.parentId === null) break;
            current = nodes.get(current.parentId);
            if (!current) throw new Error('Родитель пункта меню не найден');
        }
        if (node.parentId === null) roots.push(node);
        else nodes.get(node.parentId)!.children.push(node);
    }

    const sortTree = (siblings: EditableMenuItemDto[]): EditableMenuItemDto[] => siblings
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
        .map((node) => ({ ...node, children: sortTree(node.children) }));

    const virtualItem: EditableVirtualMenuItem = {
        kind: "root",
        id: "virtual-root",
        name: "Menu",
        children: sortTree(roots),
    };

    return virtualItem;
};