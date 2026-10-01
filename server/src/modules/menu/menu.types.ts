import type { PermissionSubjectType } from "../../core/access-control/contracts/permission.types";

export interface MenuData {
    parentId: number | null;
    name: string;
    slug: string;
    icon: string | null;
    iconType: "icon" | "svg" | "image" | "video";
    sortOrder: number;
    isActive: boolean;
}
export interface MenuItem extends MenuData {
    id: number;
}
export interface MenuPermissions {
    canView: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
}
export interface MenuPermissionChange {
    menuId: number;
    subjectType: PermissionSubjectType;
    subjectId: number;
    permissions: MenuPermissions | null;
}
export interface MenuVisibilityRow extends MenuItem {
    canView: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
}
