import type { VisibleMenuItemDto } from '../../../shared/api/menu/menu.types';
import type { MenuNode } from './admin-shell.types';

export function buildMenuTree(items: readonly VisibleMenuItemDto[]): MenuNode[] {
    const nodes = new Map<number, MenuNode>();
    for (const item of items) {
        if (nodes.has(item.id)) throw new Error('Повторяющийся идентификатор пункта меню');
        nodes.set(item.id, { ...item, children: [] });
    }

    const roots: MenuNode[] = [];
    for (const node of nodes.values()) {
        const visited = new Set<number>();
        let current: MenuNode | undefined = node;
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

    const sortVisible = (siblings: MenuNode[]): MenuNode[] => siblings
        .filter((node) => node.isActive && node.canView)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
        .map((node) => ({ ...node, children: sortVisible(node.children) }));
    return sortVisible(roots);
}
