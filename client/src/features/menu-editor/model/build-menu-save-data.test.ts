import { describe, expect, it } from 'vitest';
import { buildMenuSaveData } from './build-menu-save-data';
import { menuItemPanelSchema } from './MenuItemPanel.schema';
import { mockMenuItems } from '../../../shared/api/menu/menu.mock';

describe('menu item form payload', () => {
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
