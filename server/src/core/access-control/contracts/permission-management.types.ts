import type {
    PermissionAction,
    PermissionEffect,
    PermissionSubjectType,
    PermissionTargetType,
} from "./permission.types";

export interface PermissionChange {
    subjectType: PermissionSubjectType;
    subjectId: number;
    targetType: PermissionTargetType;
    targetId: number;
    action: PermissionAction;
    effect: PermissionEffect | null;
}

export interface StoredPermission {
    targetType: PermissionTargetType;
    targetId: number;
    action: PermissionAction;
    effect: PermissionEffect;
}

export interface PermissionTarget {
    resourceId: number;
    resourceState: "present" | "missing";
    fieldState?: "present" | "missing";
    isServiceTable: boolean;
    tableName: string;
    resourceType: "table" | "view";
}
