import type { XYPosition } from '@xyflow/react';
import type { ManageableMenuItemDto } from '../../../shared/api/menu/menu.types';
import { buildEditorGraph } from './build-editor-graph';
import { buildEditorTree } from './build-editor-tree';
import { getMenuSubtreeIds } from './get-menu-subtree-ids';
import { MENU_NODE_HEIGHT, MENU_NODE_WIDTH, type MenuBoardNode, type MenuEditorGraph } from './menu-editor-graph.types';
import type { EditableMenuNode } from './menu-editor-tree.types';

type MenuId = EditableMenuNode['id'];

export function findMenuDropTarget(
    pointer: XYPosition,
    nodes: readonly MenuBoardNode[],
    excludedIds: ReadonlySet<number>,
    currentTargetId: MenuId | null,
): MenuBoardNode | null {
    const contains = (node: MenuBoardNode, padding: number) => {
        const id = node.data.menuId;
        return !(typeof id === 'number' && excludedIds.has(id)) &&
            pointer.x >= node.position.x - padding &&
            pointer.x <= node.position.x + MENU_NODE_WIDTH + padding &&
            pointer.y >= node.position.y - padding &&
            pointer.y <= node.position.y + MENU_NODE_HEIGHT + padding;
    };

    const current = nodes.find((node) => node.data.menuId === currentTargetId);
    if (current && contains(current, 12)) return current;
    return nodes.find((node) => contains(node, 0)) ?? null;
}

export function buildMenuDragPreview(
    items: readonly ManageableMenuItemDto[],
    rootId: number,
    targetId: MenuId,
    targetPosition: XYPosition,
): MenuEditorGraph {
    const subtree = getMenuSubtreeIds(items, rootId);
    if (typeof targetId === 'number' && subtree.has(targetId)) {
        throw new Error('Нельзя перенести пункт меню в собственное поддерево');
    }
    if (typeof targetId === 'number' && !items.some((item) => item.id === targetId)) {
        throw new Error('Родитель пункта меню не найден');
    }
    const parentId = targetId === 'virtual-root' ? null : targetId;
    const lastOrder = items.reduce((max, item) =>
        item.parentId === parentId && item.id !== rootId ? Math.max(max, item.sortOrder) : max, -1);
    const previewItems = items.map((item) => item.id === rootId && item.parentId !== parentId
        ? { ...item, parentId, sortOrder: lastOrder + 1 }
        : item);
    const graph = buildEditorGraph(buildEditorTree(previewItems));
    const target = graph.nodes.find((node) => node.data.menuId === targetId)!;
    const offset = { x: targetPosition.x - target.position.x, y: targetPosition.y - target.position.y };

    return {
        edges: graph.edges,
        nodes: graph.nodes.map((node) => ({
            ...node,
            position: node.data.menuId === targetId ? { ...targetPosition } : {
                x: node.position.x + offset.x,
                y: node.position.y + offset.y,
            },
        })),
    };
}
