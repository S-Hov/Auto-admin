
export type { PermissionChange } from '@auto-admin/contracts/access-control';

export type { StoredPermission } from '@auto-admin/contracts/access-control';

export interface PermissionTarget {
    resourceId: number;
    resourceState: "present" | "missing";
    fieldState?: "present" | "missing";
    isServiceTable: boolean;
    tableName: string;
    resourceType: "table" | "view";
}
