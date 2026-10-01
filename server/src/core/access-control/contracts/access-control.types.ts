import type { CachedSchemaCatalog } from "../../schema-catalog";
import type {
    FieldPermissionAction,
    ResourcePermissionAction,
} from "./permission.types";

export interface AccessPrincipal {
    userId: number;
    roleId: number;
    roleKey: string;
    rights: "full" | "read_only" | "manager" | "none" | "custom";
}

export type AccessDecisionSource =
    | "admin"
    | "user"
    | "role"
    | "resource"
    | "schema"
    | "default";

export type AccessDenialReason =
    | "RESOURCE_MISSING"
    | "SERVICE_RESOURCE_FORBIDDEN"
    | "VIEW_WRITE_FORBIDDEN"
    | "RESOURCE_DENIED"
    | "FIELD_MISSING"
    | "FIELD_RESOURCE_MISMATCH"
    | "FIELD_DENIED";

export type AccessDecision =
    | { allowed: true; source: AccessDecisionSource }
    | {
          allowed: false;
          source: AccessDecisionSource;
          reason: AccessDenialReason;
      };

export interface PreparedAccessContext {
    readonly catalog: CachedSchemaCatalog;
    checkResource(
        resourceId: number,
        action: ResourcePermissionAction,
    ): AccessDecision;
    checkField(
        resourceId: number,
        fieldId: number,
        action: FieldPermissionAction,
    ): AccessDecision;
}
