import type { UnifiedResponse } from "../types";
import { mockMenuItems } from "./menu.mock";
import type { MenuItemDto } from "./menu.types";

// Пока источник — макет. Позже здесь будет вызов apiClient для /menu.
export async function getMenu(): Promise<UnifiedResponse<MenuItemDto[]>> {
    return {
        success: true,
        code: "COMMON.OK",
        data: mockMenuItems.map((item) => ({ ...item })),
    };
}
