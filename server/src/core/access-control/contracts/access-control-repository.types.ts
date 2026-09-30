import type {
    FieldPermissionRule,
    ResourcePermissionRule,
} from "./permission.types";

export interface PermissionRuleSubject {
    userId: number;
    roleId: number;
}

export interface PermissionRuleSet {
    roleResourceRules: ResourcePermissionRule[];
    userResourceRules: ResourcePermissionRule[];
    roleFieldRules: FieldPermissionRule[];
    userFieldRules: FieldPermissionRule[];
}
