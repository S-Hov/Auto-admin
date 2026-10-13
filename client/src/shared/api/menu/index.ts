import { ApiContractError } from '../apiClient';
import { mockMenuItems } from './menu.mock';
import { menuResponseSchema } from './menu.schema';

// Keep validation local to the mock until the API client migration is merged.
export async function getMenu() {
    const result = menuResponseSchema.safeParse({
        success: true,
        code: 'COMMON.OK',
        data: mockMenuItems.map((item) => ({ ...item })),
    });
    if (!result.success) {
        throw new ApiContractError(200);
    }
    return result.data;
}
