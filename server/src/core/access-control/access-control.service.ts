import { databaseRuntime } from "../../db/runtime/database.runtime";
import { schemaCatalogService } from "../schema-catalog";
import type {
    AccessPrincipal,
    PreparedAccessContext,
} from "./contracts/access-control.types";
import {
    evaluateFieldPermission,
    evaluateResourcePermission,
} from "./policy/permission.evaluator";
import { getActiveAccessControlProvider } from "./runtime/access-control.runtime";

export class AccessControlService {
    async prepareContext(principal: AccessPrincipal): Promise<PreparedAccessContext> {
        const catalog = await schemaCatalogService.getCatalog();
        const provider = getActiveAccessControlProvider();
        const repository = provider.createRepository(databaseRuntime.getProvider());
        const rules = await repository.getPermissionsForUser({
            userId: principal.userId,
            roleId: principal.roleId,
        });
        const contextPrincipal = { ...principal };

        const resourcesById = new Map(catalog.resources.map((resource) => [resource.id, resource]));
        const fieldsById = new Map(catalog.fields.map((field) => [field.id, field]));

        return {
            catalog,
            checkResource(resourceId, action) {
                const resource = resourcesById.get(resourceId);
                if (!resource) {
                    return {
                        allowed: false,
                        source: "schema",
                        reason: "RESOURCE_MISSING",
                    };
                }
                return evaluateResourcePermission(contextPrincipal, resource, action, rules);
            },
            checkField(resourceId, fieldId, action) {
                const resource = resourcesById.get(resourceId);
                if (!resource) {
                    return {
                        allowed: false,
                        source: "schema",
                        reason: "RESOURCE_MISSING",
                    };
                }

                const field = fieldsById.get(fieldId);
                if (!field) {
                    return {
                        allowed: false,
                        source: "schema",
                        reason: "FIELD_MISSING",
                    };
                }
                return evaluateFieldPermission(contextPrincipal, resource, field, action, rules);
            },
        };
    }
}

export const accessControlService = new AccessControlService();
