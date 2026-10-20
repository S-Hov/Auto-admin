import { describe, expect, it } from 'vitest';
import type { ManageableMenuItemDto } from '../../../shared/api/menu/menu.types';
import { buildEditorGraph } from './build-editor-graph';
import { buildEditorTree } from './build-editor-tree';
import { buildMenuDragPreview, findMenuDropTarget } from './menu-drag-preview';

function item(id: number, parentId: number | null): ManageableMenuItemDto {
    return { id, parentId, name: `Item ${id}`, slug: `item-${id}`, icon: null, iconType: 'icon', sortOrder: id, isActive: true };
}
const items = [item(1, null), item(2, 1), item(3, 2), item(4, null), item(5, 4)];

describe('buildMenuDragPreview', () => {
    it('reparents the entire branch and keeps the target exactly at its anchor', () => {
        const before = structuredClone(items);
        const position = { x: 781, y: -135 };
        const graph = buildMenuDragPreview(items, 2, 4, position);
        expect(graph.nodes.find((node) => node.id === '4')?.position).toEqual(position);
        expect(graph.edges.map((edge) => edge.id)).toContain('4->2');
        expect(graph.edges.map((edge) => edge.id)).toContain('2->3');
        expect(graph.edges.map((edge) => edge.id)).not.toContain('1->2');
        expect(graph.nodes).toHaveLength(items.length + 1);
        expect(graph.nodes.find((node) => node.id === '4')?.data.childCount).toBe(2);
        expect(items).toEqual(before);
    });
    it('allows moving a branch to the virtual root', () => {
        const graph = buildMenuDragPreview(items, 2, 'virtual-root', { x: 25, y: 90 });
        expect(graph.edges.map((edge) => edge.id)).toContain('virtual-root->2');
        expect(graph.nodes.find((node) => node.id === 'virtual-root')?.position).toEqual({ x: 25, y: 90 });
    });
    it('preserves the original layout when hovering the current parent', () => {
        const original = buildEditorGraph(buildEditorTree(items));
        const target = original.nodes.find((node) => node.id === '1')!;
        expect(buildMenuDragPreview(items, 2, 1, target.position)).toEqual(original);
    });
    it('rejects cycles, self-parenting and missing parents', () => {
        for (const target of [2, 3, 99]) {
            expect(() => buildMenuDragPreview(items, 2, target, { x: 0, y: 0 })).toThrow();
        }
    });
    it('keeps the next hovered target at its displayed preview position too', () => {
        const first = buildMenuDragPreview(items, 2, 4, { x: 720, y: 40 });
        const nextTarget = first.nodes.find((node) => node.id === '5')!;
        const second = buildMenuDragPreview(items, 2, 5, nextTarget.position);
        expect(second.nodes.find((node) => node.id === '5')?.position).toEqual(nextTarget.position);
    });
});

describe('findMenuDropTarget', () => {
    const graph = buildEditorGraph(buildEditorTree(items));
    const target = graph.nodes.find((node) => node.id === '4')!;
    const center = { x: target.position.x + 80, y: target.position.y + 68 };

    it('finds the node under the cursor', () => {
        expect(findMenuDropTarget(center, graph.nodes, new Set([2, 3]), null)?.data.menuId).toBe(4);
    });
    it('excludes the dragged item and its descendants', () => {
        expect(findMenuDropTarget(center, graph.nodes, new Set([4, 5]), null)).toBeNull();
    });
    it('retains an active target just outside its border, but does not acquire it there', () => {
        const point = { x: target.position.x - 8, y: center.y };
        expect(findMenuDropTarget(point, [target], new Set(), 4)).toBe(target);
        expect(findMenuDropTarget(point, [target], new Set(), null)).toBeNull();
    });
    it('releases the target after leaving the padded area', () => {
        expect(findMenuDropTarget({ x: target.position.x - 20, y: center.y }, [target], new Set(), 4)).toBeNull();
    });
    it('supports the virtual root as a target', () => {
        const root = graph.nodes.find((node) => node.id === 'virtual-root')!;
        expect(findMenuDropTarget(root.position, [root], new Set(), null)?.data.menuId).toBe('virtual-root');
    });
});
