import type {
    FieldPermissionAction,
    PermissionEffect,
    ResourcePermissionAction,
} from "../../contracts/permission.types";

export interface MySqlResourcePermissionRow {
    resource_id: number;
    action: ResourcePermissionAction;
    effect: PermissionEffect;
}

export interface MySqlFieldPermissionRow {
    field_id: number;
    action: FieldPermissionAction;
    effect: PermissionEffect;
}
