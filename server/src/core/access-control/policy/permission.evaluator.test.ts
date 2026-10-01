import { describe, expect, it } from "vitest";
import {
    admin,
    manager,
    catalog,
    emptyRules,
    repository,
} from "../../../../tests/fixtures/access.fixture";
import {
    evaluateFieldPermission,
    evaluateResourcePermission,
} from "./permission.evaluator";
import { AccessControlService } from "../access-control.service";

describe("effective permissions", () => {
    it("defaults to deny for a non-admin, including legacy full rights on another role", () => {
        expect(
            evaluateResourcePermission(
                manager,
                catalog().resources[0],
                "read",
                emptyRules(),
            ).allowed,
        ).toBe(false);
        expect(
            evaluateResourcePermission(
                { ...manager, rights: "full" },
                catalog().resources[0],
                "read",
                emptyRules(),
            ).allowed,
        ).toBe(false);
    });
    it.each([
        ["allow", "deny", false],
        ["deny", "allow", true],
        ["allow", "allow", true],
        ["deny", "deny", false],
    ] as const)(
        "user %s role %s follows the user override",
        (roleEffect, userEffect, allowed) => {
            const rules = emptyRules();
            rules.roleResourceRules.push({
                resourceId: 1,
                action: "read",
                effect: roleEffect,
            });
            rules.userResourceRules.push({
                resourceId: 1,
                action: "read",
                effect: userEffect,
            });
            expect(
                evaluateResourcePermission(
                    manager,
                    catalog().resources[0],
                    "read",
                    rules,
                ),
            ).toMatchObject({ allowed, source: "user" });
        },
    );
    it("field allow cannot open a denied resource", () => {
        const rules = emptyRules();
        rules.userFieldRules.push({
            fieldId: 3,
            action: "read",
            effect: "allow",
        });
        expect(
            evaluateFieldPermission(
                manager,
                catalog().resources[0],
                catalog().fields[2],
                "read",
                rules,
            ),
        ).toMatchObject({ allowed: false, reason: "RESOURCE_DENIED" });
    });
    it("fields inherit resources and user field overrides role field deny", () => {
        const schema = catalog(),
            rules = emptyRules();
        rules.roleResourceRules.push({
            resourceId: 1,
            action: "read",
            effect: "allow",
        });
        expect(
            evaluateFieldPermission(
                manager,
                schema.resources[0],
                schema.fields[2],
                "read",
                rules,
            ),
        ).toMatchObject({ allowed: true, source: "resource" });
        rules.roleFieldRules.push({
            fieldId: 3,
            action: "read",
            effect: "deny",
        });
        expect(
            evaluateFieldPermission(
                manager,
                schema.resources[0],
                schema.fields[2],
                "read",
                rules,
            ).allowed,
        ).toBe(false);
        rules.userFieldRules.push({
            fieldId: 3,
            action: "read",
            effect: "allow",
        });
        expect(
            evaluateFieldPermission(
                manager,
                schema.resources[0],
                schema.fields[2],
                "read",
                rules,
            ),
        ).toMatchObject({ allowed: true, source: "user" });
    });
    it("missing resources/fields, service resources, mismatches and view writes reject admin", () => {
        const schema = catalog(),
            rules = emptyRules();
        expect(
            evaluateResourcePermission(
                admin,
                { ...schema.resources[0], state: "missing" },
                "read",
                rules,
            ).allowed,
        ).toBe(false);
        expect(
            evaluateResourcePermission(
                admin,
                { ...schema.resources[2], isServiceTable: false },
                "read",
                rules,
            ).allowed,
        ).toBe(false);
        expect(
            evaluateResourcePermission(
                admin,
                schema.resources[3],
                "create",
                rules,
            ).allowed,
        ).toBe(false);
        expect(
            evaluateFieldPermission(
                admin,
                schema.resources[0],
                schema.fields[5],
                "read",
                rules,
            ),
        ).toMatchObject({ allowed: false, reason: "FIELD_RESOURCE_MISMATCH" });
        expect(
            evaluateFieldPermission(
                admin,
                schema.resources[0],
                { ...schema.fields[2], state: "missing" },
                "read",
                rules,
            ).allowed,
        ).toBe(false);
    });
});

describe("accessible catalog", () => {
    it("uses the same decisions and never includes hidden fields or service resources", async () => {
        const rules = emptyRules();
        rules.roleResourceRules.push({
            resourceId: 1,
            action: "read",
            effect: "allow",
        });
        rules.roleFieldRules.push({
            fieldId: 4,
            action: "read",
            effect: "deny",
        });
        const service = new AccessControlService(
            async () => catalog(),
            () => repository(rules),
        );
        const result = await service.getAccessibleCatalog(manager);
        expect(result.resources.map((resource) => resource.tableName)).toEqual([
            "orders",
        ]);
        expect(result.resources[0].fields.map((field) => field.name)).toEqual([
            "id",
            "user_id",
            "total",
        ]);
        const context = await service.prepareContext(manager);
        for (const resource of result.resources)
            for (const field of resource.fields)
                for (const action of field.actions) {
                    expect(
                        context.checkField(resource.id, field.id, action)
                            .allowed,
                    ).toBe(true);
                }
    });
    it("returns read-only views and no write action on generated columns", async () => {
        const schema = catalog();
        schema.fields[2].generated.isGenerated = true;
        const service = new AccessControlService(
            async () => schema,
            () => repository(),
        );
        const result = await service.getAccessibleCatalog(admin);
        expect(
            result.resources.find((resource) => resource.type === "view")
                ?.actions,
        ).toEqual(["read"]);
        expect(
            result.resources
                .find((resource) => resource.id === 1)
                ?.fields.find((field) => field.id === 3)?.actions,
        ).toEqual(["read"]);
    });
});
