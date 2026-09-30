export const RESOURCE_PERMISSION_ACTIONS = [
    "create",
    "read",
    "update",
    "delete",
] as const;

export const FIELD_PERMISSION_ACTIONS = ["read", "update", "create"] as const;

export const PERMISSION_EFFECTS = ["allow", "deny"] as const;

export const PERMISSION_SUBJECT_TYPES = ["user", "role"] as const;

export const PERMISSION_TARGET_TYPES = ["resource", "field"] as const;
