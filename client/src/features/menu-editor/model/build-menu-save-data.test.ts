import { describe, expect, it } from 'vitest';
import { buildMenuSaveData, buildNewMenuItemContext, buildNewMenuSaveData, upsertSavedMenuItem } from './build-menu-save-data';
import { menuItemPanelSchema } from './MenuItemPanel.schema';
import { mockMenuItems } from '../../../shared/api/menu/menu.mock';

describe('menu item form payload', () => {
    it('creates a root item without a fake database ID', () => {
        const context = buildNewMenuItemContext([], null);
        const payload = buildNewMenuSaveData(context, { name: 'Orders', slug: 'orders', icon: null });
        expect(payload).toEqual({ parentId: null, name: 'Orders', slug: 'orders', icon: null, iconType: 'icon', sortOrder: 10, isActive: true });
        expect(payload).not.toHaveProperty('id');
    });
    it('creates a child after the existing siblings', () => {
        const context = buildNewMenuItemContext(mockMenuItems, 1);
        const payload = buildNewMenuSaveData(context, { name: 'New child', slug: 'new-child', icon: 'menu-bullet-list' });
        expect(payload.parentId).toBe(1);
        expect(payload.sortOrder).toBeGreaterThan(Math.max(...mockMenuItems.filter((item) => item.parentId === 1).map((item) => item.sortOrder)));
    });
    it('rejects missing parents before creating a draft', () => {
        expect(() => buildNewMenuItemContext(mockMenuItems, 999999)).toThrow();
    });
    it('appends the created item using the ID confirmed by the server', () => {
        const payload = buildNewMenuSaveData(buildNewMenuItemContext(mockMenuItems, 1), { name: 'Child', slug: 'child', icon: null });
        const items = upsertSavedMenuItem(mockMenuItems, payload, 100);
        expect(items).toHaveLength(mockMenuItems.length + 1);
        expect(items.at(-1)).toEqual({ ...payload, id: 100 });
        expect(mockMenuItems.some((item) => item.id === 100)).toBe(false);
    });
    it('updates an existing item without duplicating it', () => {
        const payload = buildMenuSaveData(mockMenuItems[0], { name: 'Renamed', slug: 'renamed', icon: null });
        const items = upsertSavedMenuItem(mockMenuItems, payload, mockMenuItems[0].id);
        expect(items).toHaveLength(mockMenuItems.length);
        expect(items[0].name).toBe('Renamed');
        expect(mockMenuItems[0].name).not.toBe('Renamed');
    });
    it('preserves structural fields and excludes navigation permission flags', () => {
        const item = mockMenuItems[1];
        const values = menuItemPanelSchema.parse({ name: ' New name ', slug: 'new-slug', icon: 'menu-hamburger-classic' });
        const data = buildMenuSaveData(item, values);
        expect(data).toEqual({ id: item.id, parentId: item.parentId, name: 'New name', slug: 'new-slug', icon: 'menu-hamburger-classic', iconType: 'icon', sortOrder: item.sortOrder, isActive: item.isActive });
        expect(data).not.toHaveProperty('canView');
    });
    it('preserves media type when only the name is changed', () => {
        const item = { ...mockMenuItems[0], icon: 'https://example.com/image.png', iconType: 'image' as const };
        expect(buildMenuSaveData(item, { name: 'Changed', slug: item.slug, icon: item.icon }).iconType).toBe('image');
    });
    it('switches media type to icon when a catalog icon is selected', () => {
        const item = { ...mockMenuItems[0], icon: 'https://example.com/video.mp4', iconType: 'video' as const };
        expect(buildMenuSaveData(item, { name: item.name, slug: item.slug, icon: 'menu-bullet-list' }).iconType).toBe('icon');
    });
    it.each([
        { name: ' ', slug: 'orders', icon: null },
        { name: 'Orders', slug: 'Invalid slug', icon: null },
        { name: 'Orders', slug: 'orders', icon: undefined },
    ])('rejects invalid form data: %j', (values) => {
        expect(menuItemPanelSchema.safeParse(values).success).toBe(false);
    });
});
