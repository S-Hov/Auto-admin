import { describe, expect, it } from 'vitest';
import { buildMenuSaveData, buildNewMenuItemContext, buildNewMenuSaveData, upsertSavedMenuItem } from './build-menu-save-data';
import { menuItemPanelSchema } from './MenuItemPanel.schema';
import { mockMenuItems } from '../../../shared/api/menu/menu.mock';

describe('menu item form payload', () => {
    it('preserves a page binding locally when a legacy save omits pageId or sets it to undefined', () => {
        const item = { ...mockMenuItems[0], pageId: 42 };
        const data = { id: item.id, parentId: item.parentId, name: 'Renamed', slug: item.slug, icon: item.icon, iconType: item.iconType, sortOrder: item.sortOrder, isActive: item.isActive };
        expect(upsertSavedMenuItem([item], data, item.id)[0].pageId).toBe(42);
        expect(upsertSavedMenuItem([item], { ...data, pageId: undefined }, item.id)[0].pageId).toBe(42);
    });

    it.each([43, null])('updates the local binding when explicitly supplied: %s', (pageId) => {
        const item = { ...mockMenuItems[0], pageId: 42 };
        const data = { id: item.id, parentId: item.parentId, name: item.name, slug: item.slug, icon: item.icon, iconType: item.iconType, sortOrder: item.sortOrder, isActive: item.isActive, pageId };
        expect(upsertSavedMenuItem([item], data, item.id)[0].pageId).toBe(pageId);
    });
    it('creates a root item without a fake database ID', () => {
        const context = buildNewMenuItemContext([], null);
        const payload = buildNewMenuSaveData(context, { name: 'Orders', slug: 'orders', icon: null, sortOrder: context.sortOrder, isActive: true });
        expect(payload).toEqual({ parentId: null, name: 'Orders', slug: 'orders', icon: null, iconType: 'icon', sortOrder: 10, isActive: true });
        expect(payload).not.toHaveProperty('id');
    });
    it('creates a child after the existing siblings', () => {
        const context = buildNewMenuItemContext(mockMenuItems, 1);
        const payload = buildNewMenuSaveData(context, { name: 'New child', slug: 'new-child', icon: 'menu-bullet-list', sortOrder: context.sortOrder, isActive: true });
        expect(payload.parentId).toBe(1);
        expect(payload.sortOrder).toBeGreaterThan(Math.max(...mockMenuItems.filter((item) => item.parentId === 1).map((item) => item.sortOrder)));
    });
    it('rejects missing parents before creating a draft', () => {
        expect(() => buildNewMenuItemContext(mockMenuItems, 999999)).toThrow();
    });
    it('appends the created item using the ID confirmed by the server', () => {
        const context = buildNewMenuItemContext(mockMenuItems, 1);
        const payload = buildNewMenuSaveData(context, { name: 'Child', slug: 'child', icon: null, sortOrder: context.sortOrder, isActive: true });
        const items = upsertSavedMenuItem(mockMenuItems, payload, 100);
        expect(items).toHaveLength(mockMenuItems.length + 1);
        expect(items.at(-1)).toEqual({ ...payload, id: 100 });
        expect(mockMenuItems.some((item) => item.id === 100)).toBe(false);
    });
    it('updates an existing item without duplicating it', () => {
        const payload = buildMenuSaveData(mockMenuItems[0], { name: 'Renamed', slug: 'renamed', icon: null, sortOrder: 0, isActive: false });
        const items = upsertSavedMenuItem(mockMenuItems, payload, mockMenuItems[0].id);
        expect(items).toHaveLength(mockMenuItems.length);
        expect(items[0].name).toBe('Renamed');
        expect(items[0].sortOrder).toBe(0);
        expect(items[0].isActive).toBe(false);
        expect(mockMenuItems[0].name).not.toBe('Renamed');
    });
    it('preserves identity and parent, uses editable form values and excludes navigation permission flags', () => {
        const item = mockMenuItems[1];
        const values = menuItemPanelSchema.parse({ name: ' New name ', slug: 'new-slug', icon: 'menu-hamburger-classic', sortOrder: -5, isActive: false });
        const data = buildMenuSaveData(item, values);
        expect(data).toEqual({ id: item.id, parentId: item.parentId, name: 'New name', slug: 'new-slug', icon: 'menu-hamburger-classic', iconType: 'icon', sortOrder: -5, isActive: false });
        expect(data).not.toHaveProperty('canView');
    });
    it('preserves media type when only the name is changed', () => {
        const item = { ...mockMenuItems[0], icon: 'https://example.com/image.png', iconType: 'image' as const };
        expect(buildMenuSaveData(item, { name: 'Changed', slug: item.slug, icon: item.icon, sortOrder: item.sortOrder, isActive: item.isActive }).iconType).toBe('image');
    });
    it('switches media type to icon when a catalog icon is selected', () => {
        const item = { ...mockMenuItems[0], icon: 'https://example.com/video.mp4', iconType: 'video' as const };
        expect(buildMenuSaveData(item, { name: item.name, slug: item.slug, icon: 'menu-bullet-list', sortOrder: item.sortOrder, isActive: item.isActive }).iconType).toBe('icon');
    });
    it.each([
        { name: ' ', slug: 'orders', icon: null },
        { name: 'Orders', slug: 'Invalid slug', icon: null },
        { name: 'Orders', slug: 'orders', icon: undefined },
    ])('rejects invalid form data: %j', (values) => {
        expect(menuItemPanelSchema.safeParse({ sortOrder: 10, isActive: true, ...values }).success).toBe(false);
    });

    it('uses activity and order from the create form rather than draft defaults', () => {
        const context = buildNewMenuItemContext([], null);
        const before = { ...context };
        const payload = buildNewMenuSaveData(context, { name: 'Hidden', slug: 'hidden', icon: null, sortOrder: 0, isActive: false });
        expect(payload).toMatchObject({ sortOrder: 0, isActive: false });
        expect(context).toEqual(before);
    });

    it.each([true, false])('saves the chosen activity (%s) without mutating the original item', (isActive) => {
        const item = { ...mockMenuItems[0], isActive: !isActive, sortOrder: 100 };
        const before = { ...item };
        const data = buildMenuSaveData(item, { name: item.name, slug: item.slug, icon: item.icon, sortOrder: 0, isActive });
        expect(data).toMatchObject({ sortOrder: 0, isActive });
        expect(item).toEqual(before);
    });

    it.each([-1_000_000, 0, 1_000_000])('accepts a valid order: %s', (sortOrder) => {
        const result = menuItemPanelSchema.safeParse({ name: 'Orders', slug: 'orders', icon: null, sortOrder, isActive: false });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data).toMatchObject({ sortOrder, isActive: false });
    });

    it.each([
        { sortOrder: -1_000_001 }, { sortOrder: 1_000_001 }, { sortOrder: 1.5 },
        { sortOrder: '' }, { sortOrder: '10' }, { sortOrder: undefined },
        { sortOrder: Number.NaN }, { sortOrder: Number.POSITIVE_INFINITY },
        { isActive: 'true' }, { isActive: 1 }, { isActive: null }, { isActive: undefined },
    ])('rejects invalid order or activity: %j', (invalid) => {
        const result = menuItemPanelSchema.safeParse({ name: 'Orders', slug: 'orders', icon: null, sortOrder: 10, isActive: true, ...invalid });
        expect(result.success).toBe(false);
    });
});
