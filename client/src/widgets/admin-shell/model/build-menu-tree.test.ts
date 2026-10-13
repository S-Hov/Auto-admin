import { describe, expect, it } from 'vitest';
import { mockMenuItems } from '../../../shared/api/menu/menu.mock';
import { buildMenuTree } from './build-menu-tree';

describe('buildMenuTree', () => {
    it('builds sorted nested items without modifying the source', () => {
        const items = mockMenuItems.slice(0, 4).map((item) => ({ ...item })).reverse();
        const before = structuredClone(items);
        const tree = buildMenuTree(items);
        expect(tree.map((item) => item.id)).toEqual([1, 4]);
        expect(tree[0].children.map((item) => item.id)).toEqual([2, 3]);
        expect(items).toEqual(before);
    });

    it('hides descendants of a hidden parent', () => {
        const items = mockMenuItems.slice(0, 4).map((item) => ({ ...item, canView: item.id !== 1 }));
        expect(buildMenuTree(items).map((item) => item.id)).toEqual([4]);
    });

    it('handles an empty menu', () => {
        expect(buildMenuTree([])).toEqual([]);
    });

    it('rejects duplicate IDs', () => {
        expect(() => buildMenuTree([mockMenuItems[0], mockMenuItems[0]])).toThrow();
    });

    it('rejects a missing parent', () => {
        expect(() => buildMenuTree([{ ...mockMenuItems[0], parentId: 999 }])).toThrow();
    });

    it('rejects cycles', () => {
        expect(() => buildMenuTree([
            { ...mockMenuItems[0], parentId: 2 },
            mockMenuItems[1],
        ])).toThrow();
    });

    it('builds the extended demo with three nesting levels', () => {
        const tree = buildMenuTree(mockMenuItems);
        expect(tree).toHaveLength(7);
        const settings = tree.find((item) => item.id === 19);
        expect(settings?.children.find((item) => item.id === 21)?.children.map((item) => item.id)).toEqual([22, 23]);
    });
});
