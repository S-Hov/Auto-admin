import { describe, expect, it } from 'vitest';
import type { ManageableMenuItemDto } from '../../../shared/api/menu/menu.types';
import { getMenuSubtreeIds } from './get-menu-subtree-ids';

function item(id: number, parentId: number | null): ManageableMenuItemDto {
    return { id, parentId, name: `Item ${id}`, slug: `item-${id}`, icon: null, iconType: 'icon', sortOrder: id, isActive: true };
}
const items = [item(1, null), item(2, 1), item(3, 1), item(4, 3), item(5, null)];

describe('getMenuSubtreeIds', () => {
    it('includes the item and descendants, but not other branches', () => {
        expect(getMenuSubtreeIds(items, 1)).toEqual(new Set([1, 2, 3, 4]));
    });
    it('does not include ancestors or siblings', () => {
        expect(getMenuSubtreeIds(items, 3)).toEqual(new Set([3, 4]));
    });
    it('returns the item itself for a leaf', () => {
        expect(getMenuSubtreeIds(items, 2)).toEqual(new Set([2]));
    });
    it('does not depend on the input order or mutate it', () => {
        const shuffled = [...items].reverse();
        const before = structuredClone(shuffled);
        expect(getMenuSubtreeIds(shuffled, 1)).toEqual(new Set([1, 2, 3, 4]));
        expect(shuffled).toEqual(before);
    });
    it('includes disabled descendants too', () => {
        expect(getMenuSubtreeIds(items.map((entry) => ({ ...entry, isActive: false })), 3)).toEqual(new Set([3, 4]));
    });
    it('rejects a missing starting item', () => {
        expect(() => getMenuSubtreeIds(items, 99)).toThrow('Пункт меню с ID 99 не найден');
        expect(() => getMenuSubtreeIds([], 1)).toThrow();
    });
    it('terminates even on cyclic input, without treating it as a valid tree', () => {
        expect(getMenuSubtreeIds([item(1, 2), item(2, 1)], 1)).toEqual(new Set([1, 2]));
    });
    it('handles a long chain without recursive calls', () => {
        const chain = Array.from({ length: 12000 }, (_, index) => item(index + 1, index === 0 ? null : index));
        expect(getMenuSubtreeIds(chain, 1).size).toBe(chain.length);
    });
});
