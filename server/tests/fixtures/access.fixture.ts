import { vi } from "vitest";
import type {
    SchemaCatalog,
    StoredField,
    StoredResource,
} from "../../src/core/schema-catalog/types/schema-catalog.types";
import type { AccessPrincipal } from "../../src/core/access-control";
import type { PermissionRuleSet } from "../../src/core/access-control/contracts/access-control-repository.types";
import type { AccessControlRepository } from "../../src/core/access-control/contracts/access-control-repository.interface";
import type { DatabaseProvider } from "../../src/db/contracts/provider.interface";

export const admin: AccessPrincipal = {
    userId: 1,
    roleId: 1,
    roleKey: "admin",
    rights: "full",
};
export const manager: AccessPrincipal = {
    userId: 2,
    roleId: 2,
    roleKey: "manager",
    rights: "manager",
};

export function resource(
    id: number,
    tableName: string,
    overrides: Partial<StoredResource> = {},
): StoredResource {
    return {
        id,
        schemaName: "shop",
        tableName,
        type: "table",
        engine: "InnoDB",
        comment: null,
        isServiceTable: false,
        state: "present",
        firstSeenScanId: 1,
        lastSeenScanId: 1,
        ...overrides,
    };
}
export function field(
    id: number,
    resourceId: number,
    name: string,
    overrides: Partial<StoredField> = {},
): StoredField {
    return {
        id,
        resourceId,
        name,
        position: id,
        dataType: "int",
        characterMaximumLength: null,
        numericPrecision: null,
        numericScale: null,
        datetimePrecision: null,
        columnType: "int",
        nullable: false,
        defaultValue: null,
        generated: { isGenerated: false, generationExpression: null },
        autoIncrement: false,
        extra: "",
        characterSetName: null,
        collationName: null,
        comment: null,
        state: "present",
        firstSeenScanId: 1,
        lastSeenScanId: 1,
        ...overrides,
    };
}
export function catalog(): SchemaCatalog {
    return {
        schemaName: "shop",
        fingerprint: "test",
        loadedAt: 0,
        resources: [
            resource(1, "orders"),
            resource(2, "users"),
            resource(3, "Auto_Admin__sessions", { isServiceTable: true }),
            resource(4, "summary", { type: "view", engine: null }),
        ],
        fields: [
            field(1, 1, "id"),
            field(2, 1, "user_id"),
            field(3, 1, "total"),
            field(4, 1, "internal_note"),
            field(5, 2, "id"),
            field(6, 2, "name"),
            field(7, 3, "token_hash"),
            field(8, 4, "total"),
        ],
        constraints: [],
        indexes: [],
    };
}
export function emptyRules(): PermissionRuleSet {
    return {
        roleResourceRules: [],
        userResourceRules: [],
        roleFieldRules: [],
        userFieldRules: [],
    };
}
export function repository(rules = emptyRules()): AccessControlRepository {
    return {
        getPermissionsForUser: vi.fn(async () => rules),
        isActiveSystemAdminForUpdate: vi.fn(async () => true),
        subjectExists: vi.fn(async () => true),
        getTargetForUpdate: vi.fn(async () => ({
            resourceId: 1,
            resourceState: "present" as const,
            isServiceTable: false,
            tableName: "orders",
            resourceType: "table" as const,
        })),
        getPermissionForUpdate: vi.fn(async () => null),
        setPermission: vi.fn(async () => {}),
        appendAudit: vi.fn(async () => {}),
        listPermissions: vi.fn(async () => []),
    };
}
export function database() {
    const executor = {
        queryRows: vi.fn(async () => []),
        execute: vi.fn(async () => ({ affectedRows: 1, insertId: 1 })),
    };
    const transaction = vi.fn(
        async <T>(callback: (connection: typeof executor) => Promise<T>) =>
            callback(executor),
    );
    const provider = {
        type: "mysql",
        ...executor,
        transaction,
    } as unknown as DatabaseProvider;
    return { provider, executor, transaction };
}
