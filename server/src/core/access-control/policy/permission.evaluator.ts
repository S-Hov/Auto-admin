import type {
    StoredField,
    StoredResource,
} from "../../schema-catalog/types/schema-catalog.types";
import type {
    PermissionRuleSet,
} from "../contracts/access-control-repository.types";
import type {
    AccessDecision,
    AccessPrincipal,
} from "../contracts/access-control.types";
import type {
    FieldPermissionAction,
    PermissionEffect,
    ResourcePermissionAction,
} from "../contracts/permission.types";

function isSystemAdmin(principal: AccessPrincipal): boolean {
    return principal.roleKey === "admin" && principal.rights === "full";
}

function decisionFromRule(
    effect: PermissionEffect,
    source: "user" | "role",
    deniedReason: "RESOURCE_DENIED" | "FIELD_DENIED",
): AccessDecision {
    return effect === "allow"
        ? { allowed: true, source }
        : { allowed: false, source, reason: deniedReason };
}

export function evaluateResourcePermission(
    principal: AccessPrincipal,
    resource: StoredResource,
    action: ResourcePermissionAction,
    rules: PermissionRuleSet,
): AccessDecision {
    if (resource.state !== "present") {
        return { allowed: false, source: "schema", reason: "RESOURCE_MISSING" };
    }
    if (resource.isServiceTable) {
        return {
            allowed: false,
            source: "schema",
            reason: "SERVICE_RESOURCE_FORBIDDEN",
        };
    }
    if (resource.type === "view" && action !== "read") {
        return { allowed: false, source: "schema", reason: "VIEW_WRITE_FORBIDDEN" };
    }
    if (isSystemAdmin(principal)) {
        return { allowed: true, source: "admin" };
    }

    const userRule = rules.userResourceRules.find(
        (rule) => rule.resourceId === resource.id && rule.action === action,
    );
    if (userRule) {
        return decisionFromRule(userRule.effect, "user", "RESOURCE_DENIED");
    }

    const roleRule = rules.roleResourceRules.find(
        (rule) => rule.resourceId === resource.id && rule.action === action,
    );
    if (roleRule) {
        return decisionFromRule(roleRule.effect, "role", "RESOURCE_DENIED");
    }

    return { allowed: false, source: "default", reason: "RESOURCE_DENIED" };
}

export function evaluateFieldPermission(
    principal: AccessPrincipal,
    resource: StoredResource,
    field: StoredField,
    action: FieldPermissionAction,
    rules: PermissionRuleSet,
): AccessDecision {
    const resourceDecision = evaluateResourcePermission(
        principal,
        resource,
        action,
        rules,
    );
    if (!resourceDecision.allowed) {
        return {
            allowed: false,
            source: "resource",
            reason: resourceDecision.reason,
        };
    }
    if (field.state !== "present") {
        return { allowed: false, source: "schema", reason: "FIELD_MISSING" };
    }
    if (field.resourceId !== resource.id) {
        return {
            allowed: false,
            source: "schema",
            reason: "FIELD_RESOURCE_MISMATCH",
        };
    }
    if (isSystemAdmin(principal)) {
        return { allowed: true, source: "admin" };
    }

    const userRule = rules.userFieldRules.find(
        (rule) => rule.fieldId === field.id && rule.action === action,
    );
    if (userRule) {
        return decisionFromRule(userRule.effect, "user", "FIELD_DENIED");
    }

    const roleRule = rules.roleFieldRules.find(
        (rule) => rule.fieldId === field.id && rule.action === action,
    );
    if (roleRule) {
        return decisionFromRule(roleRule.effect, "role", "FIELD_DENIED");
    }

    return { allowed: true, source: "resource" };
}
