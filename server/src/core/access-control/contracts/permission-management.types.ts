


export interface PermissionTarget {
    resourceId: number;
    resourceState: "present" | "missing";
    fieldState?: "present" | "missing";
    isServiceTable: boolean;
    tableName: string;
    resourceType: "table" | "view";
}
