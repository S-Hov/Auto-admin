import { describe, expect, it } from 'vitest';
import type { ManageableMenuItemDto } from '../../../shared/api/menu/menu.types';
import { menuSaveDataSchema } from '../../../shared/api/menu/menu.schema';
import { buildMenuMoveData } from './build-menu-move-data';
import { buildEditorTree } from './build-editor-tree';

function item(id: number, parentId: number | null, sortOrder = 10): ManageableMenuItemDto {
    return { id, parentId, sortOrder, name: `Item ${id}`, slug: `item-${id}`, icon: null, iconType: 'icon', isActive: true };
}

function fixture() {
    return [item(1, null, 10), item(2, 1, 20), item(3, 2, 900), item(4, null, 50), item(5, 4, 30), item(6, 3, 800)];
}

describe('buildMenuMoveData', () => {
    it('moves a branch after the children of its new parent, preserving its properties', () => {
        const items = fixture();
        items[1] = { ...items[1], icon: 'https://example.com/image.png', iconType: 'image', isActive: false };
        const data = buildMenuMoveData(items, 2, 4);
        expect(data).toEqual({ ...items[1], parentId: 4, sortOrder: 31 });
        expect(menuSaveDataSchema.safeParse(data).success).toBe(true);
    });

    it('places the item after siblings regardless of their array order', () => {
        const items = [...fixture(), item(7, 4, 70), item(8, 4, 5)];
        expect(buildMenuMoveData(items, 2, 4)?.sortOrder).toBe(71);
    });

    it('supports a parent with no children', () => {
        const items = fixture();
        const data = buildMenuMoveData(items, 2, 5);
        expect(data?.parentId).toBe(5);
        expect(menuSaveDataSchema.safeParse(data).success).toBe(true);
    });

    it('appends to the root level when the virtual root is selected', () => {
        const items = fixture();
        expect(buildMenuMoveData(items, 2, 'virtual-root')).toEqual({ ...items[1], parentId: null, sortOrder: 51 });
    });

    it('returns no command when released without a target', () => {
        expect(buildMenuMoveData(fixture(), 2, null)).toBeNull();
    });

    it('returns no command when released over itself', () => {
        expect(buildMenuMoveData(fixture(), 2, 2)).toBeNull();
    });

    it('returns no command when released over the current parent', () => {
        expect(buildMenuMoveData(fixture(), 2, 1)).toBeNull();
    });

    it('returns no command for a root item released over the virtual root', () => {
        expect(buildMenuMoveData(fixture(), 1, 'virtual-root')).toBeNull();
    });

    it.each([3, 6])('rejects a move into descendant %i, including deeper descendants', (targetId) => {
        expect(() => buildMenuMoveData(fixture(), 2, targetId)).toThrow();
    });

    it('rejects a missing source item', () => {
        expect(() => buildMenuMoveData(fixture(), 999, 4)).toThrow();
    });

    it('rejects a missing target item', () => {
        expect(() => buildMenuMoveData(fixture(), 2, 999)).toThrow();
    });

    it('does not mutate the input, and keeps descendants attached after applying the command', () => {
        const items = fixture();
        const before = structuredClone(items);
        items.forEach(Object.freeze);
        Object.freeze(items);
        const data = buildMenuMoveData(items, 2, 4)!;
        expect(items).toEqual(before);
        const updated = items.map((entry) => entry.id === data.id ? { ...entry, ...data } : entry);
        const root = buildEditorTree(updated);
        const moved = root.children.find((entry) => entry.id === 4)?.children.find((entry) => entry.id === 2);
        expect(moved?.children[0].id).toBe(3);
        expect(moved?.children[0].children[0].id).toBe(6);
        expect(root.children.find((entry) => entry.id === 1)?.children).toEqual([]);
    });

    it('allows the last valid sortOrder accepted by the API', () => {
        const items = fixture().map((entry) => entry.id === 5 ? { ...entry, sortOrder: 999_999 } : entry);
        const data = buildMenuMoveData(items, 2, 4);
        expect(data?.sortOrder).toBe(1_000_000);
        expect(menuSaveDataSchema.safeParse(data).success).toBe(true);
    });

    it('rejects a move that cannot append within the API sortOrder limit', () => {
        const items = fixture().map((entry) => entry.id === 5 ? { ...entry, sortOrder: 1_000_000 } : entry);
        expect(() => buildMenuMoveData(items, 2, 4)).toThrow();
    });

    it('only includes save fields even when the source DTO has additional response fields', () => {
        const items = fixture().map((entry) => ({ ...entry, canView: true }));
        const data = buildMenuMoveData(items, 2, 4);
        expect(data).not.toHaveProperty('canView');
        expect(menuSaveDataSchema.safeParse(data).success).toBe(true);
    });
});
