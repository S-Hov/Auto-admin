import { expect, it } from 'vitest';
import { getMenu } from '../src/shared/api/menu';
import { mockMenuItems } from '../src/shared/api/menu/menu.mock';
import { menuResponseSchema } from '../src/shared/api/menu/menu.schema';
import { ApiContractError } from '../src/shared/api/apiClient';

it('keeps the mock envelope and returns independently validated menu items', async () => {
    const response = await getMenu();
    expect(response).toEqual({ success: true, code: 'COMMON.OK', data: mockMenuItems });
    expect(response.data[0]).not.toBe(mockMenuItems[0]);
    response.data[0].name = 'changed';
    expect((await getMenu()).data[0].name).toBe(mockMenuItems[0].name);
});

it.each([{ id: '1' }, { parentId: false }, { iconType: 'unknown' }, { canView: 1 }, { icon: {} }, { sortOrder: 1.5 }])('rejects a malformed menu item %j', (patch) => {
    expect(menuResponseSchema.safeParse({ success: true, code: 'COMMON.OK', data: [{ ...mockMenuItems[0], ...patch }] }).success).toBe(false);
});

it('rejects invalid mock data through getMenu', async () => {
    const original = mockMenuItems[0].canView;
    try {
        Reflect.set(mockMenuItems[0], 'canView', 1);
        await expect(getMenu()).rejects.toBeInstanceOf(ApiContractError);
    } finally {
        Reflect.set(mockMenuItems[0], 'canView', original);
    }
});

it('accepts an empty menu but rejects missing permissions and non-array data', () => {
    expect(menuResponseSchema.safeParse({ success: true, code: 'COMMON.OK', data: [] }).success).toBe(true);
    const missingPermission: Record<string, unknown> = { ...mockMenuItems[0] };
    delete missingPermission.canDelete;
    expect(menuResponseSchema.safeParse({ success: true, code: 'COMMON.OK', data: [missingPermission] }).success).toBe(false);
    expect(menuResponseSchema.safeParse({ success: true, code: 'COMMON.OK', data: {} }).success).toBe(false);
});
