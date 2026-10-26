import type {
    MenuData,
    MenuItem,
    MenuPermissionChange,
    MenuPermissions,
    MenuVisibilityRow,
} from "../menu.types";

export interface MenuRepository {
    readAll(forUpdate?: boolean): Promise<MenuItem[]>;
    readForUser(userId: number, roleId: number): Promise<MenuVisibilityRow[]>;
    save(data: MenuData, actorUserId: number, id?: number): Promise<number>;
    delete(id: number): Promise<void>;
    getPermissions(
        change: MenuPermissionChange,
    ): Promise<MenuPermissions | null>;
    setPermissions(change: MenuPermissionChange): Promise<void>;
    appendAudit(
        menuId: number,
        action: "create" | "update" | "delete" | "permission",
        actorUserId: number,
        previous: unknown,
        next: unknown,
        requestId: string | null,
    ): Promise<void>;
}
