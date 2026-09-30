import type {
    FIELD_PERMISSION_ACTIONS,
    PERMISSION_EFFECTS,
    PERMISSION_SUBJECT_TYPES,
    PERMISSION_TARGET_TYPES,
    RESOURCE_PERMISSION_ACTIONS,
} from "./permission.constants";

export type ResourcePermissionAction =
    (typeof RESOURCE_PERMISSION_ACTIONS)[number];
export type FieldPermissionAction = (typeof FIELD_PERMISSION_ACTIONS)[number];
export type PermissionEffect = (typeof PERMISSION_EFFECTS)[number];
export type PermissionSubjectType = (typeof PERMISSION_SUBJECT_TYPES)[number];
export type PermissionTargetType = (typeof PERMISSION_TARGET_TYPES)[number];

export type PermissionAction = ResourcePermissionAction | FieldPermissionAction;

export interface ResourcePermissionRule {
    resourceId: number;
    action: PermissionAction;
    effect: PermissionEffect;
}

export interface FieldPermissionRule {
    fieldId: number;
    action: FieldPermissionAction;
    effect: PermissionEffect;
}
