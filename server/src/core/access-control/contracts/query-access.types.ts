import type {
    FieldPermissionAction,
    ResourcePermissionAction,
} from "./permission.types";

export type FieldUsage = "select" | "where" | "sort" | "join" | "data";

export interface QueryAccessRequirements {
    readonly resources: readonly Readonly<{
        resourceId: number;
        action: ResourcePermissionAction;
    }>[];
    readonly fields: readonly Readonly<{
        resourceId: number;
        fieldId: number;
        action: FieldPermissionAction;
        usage: FieldUsage;
    }>[];
}
