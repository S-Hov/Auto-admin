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
import type { AccessControlRepository } from "./contracts/access-control-repository.interface";
import type { CachedSchemaCatalog } from "../schema-catalog";
import type {
    AccessibleCatalog,
    QueryAccessRequirements,
} from "./contracts/query-access.types";
import {
    RESOURCE_PERMISSION_ACTIONS,
    FIELD_PERMISSION_ACTIONS,
} from "./contracts/permission.constants";
import { accessDenied } from "./access-control.errors";
import { conflict, unauthorized } from "../../shared/api/errors/error-helpers";
import { logger } from "../../shared/logger";
import { SchemaCatalogNotReadyError } from "../schema-catalog/schema-catalog.errors";
import { ERROR_CODES } from "../../shared/api/codes/error-codes";

export class AccessControlService {
    constructor(
        private readonly loadCatalog: () => Promise<CachedSchemaCatalog> = () =>
            schemaCatalogService.getAuthorizationCatalog(),
        private readonly getRepository: () => AccessControlRepository = () =>
            getActiveAccessControlProvider().createRepository(
                databaseRuntime.getProvider(),
            ),
    ) {}

    async prepareContext(
        principal: AccessPrincipal,
    ): Promise<PreparedAccessContext> {
        if (
            !principal ||
            !Number.isSafeInteger(principal.userId) ||
            principal.userId <= 0 ||
            !Number.isSafeInteger(principal.roleId) ||
            principal.roleId <= 0 ||
            typeof principal.roleKey !== "string" ||
            !["full", "read_only", "manager", "none", "custom"].includes(
                principal.rights,
            )
        ) {
            throw unauthorized();
        }
        const contextPrincipal = { ...principal };
        const catalog = await this.loadCatalog().catch((error) => {
            if (error instanceof SchemaCatalogNotReadyError)
                throw conflict(ERROR_CODES.SCHEMA_CATALOG_REQUIRED);
            throw error;
        });
        const repository = this.getRepository();
        const rules = await repository.getPermissionsForUser({
            userId: contextPrincipal.userId,
            roleId: contextPrincipal.roleId,
        });

        const resourcesById = new Map(
            catalog.resources.map((resource) => [resource.id, resource]),
        );
        const fieldsById = new Map(
            catalog.fields.map((field) => [field.id, field]),
        );

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
                return evaluateResourcePermission(
                    contextPrincipal,
                    resource,
                    action,
                    rules,
                );
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
                return evaluateFieldPermission(
                    contextPrincipal,
                    resource,
                    field,
                    action,
                    rules,
                );
            },
        };
    }

    async authorize(
        requirements: QueryAccessRequirements,
        principal: AccessPrincipal,
    ): Promise<void> {
        this.assertAuthorized(
            requirements,
            await this.prepareContext(principal),
        );
    }

    assertAuthorized(
        requirements: QueryAccessRequirements,
        context: PreparedAccessContext,
    ): void {
        for (const target of requirements.resources) {
            const decision = context.checkResource(
                target.resourceId,
                target.action,
            );
            if (!decision.allowed) {
                logger.warn(
                    { decision, target },
                    "Query resource access denied",
                );
                throw accessDenied(decision, target);
            }
        }
        for (const target of requirements.fields) {
            const decision = context.checkField(
                target.resourceId,
                target.fieldId,
                target.action,
            );
            if (!decision.allowed) {
                logger.warn({ decision, target }, "Query field access denied");
                throw accessDenied(decision, target);
            }
        }
    }

    async getAccessibleCatalog(
        principal: AccessPrincipal,
    ): Promise<AccessibleCatalog> {
        const context = await this.prepareContext(principal);
        return {
            schemaName: context.catalog.schemaName,
            fingerprint: context.catalog.fingerprint,
            resources: context.catalog.resources.flatMap((resource) => {
                const actions = RESOURCE_PERMISSION_ACTIONS.filter(
                    (action) =>
                        context.checkResource(resource.id, action).allowed,
                );
                if (actions.length === 0) return [];
                return [
                    {
                        id: resource.id,
                        tableName: resource.tableName,
                        type: resource.type,
                        actions,
                        fields: context.catalog.fields
                            .filter((field) => field.resourceId === resource.id)
                            .flatMap((field) => {
                                const fieldActions =
                                    FIELD_PERMISSION_ACTIONS.filter(
                                        (action) =>
                                            !(
                                                field.generated.isGenerated &&
                                                action !== "read"
                                            ) &&
                                            context.checkField(
                                                resource.id,
                                                field.id,
                                                action,
                                            ).allowed,
                                    );
                                return fieldActions.length === 0
                                    ? []
                                    : [
                                          {
                                              id: field.id,
                                              name: field.name,
                                              dataType: field.dataType,
                                              nullable: field.nullable,
                                              actions: fieldActions,
                                          },
                                      ];
                            }),
                    },
                ];
            }),
        };
    }
}

export const accessControlService = new AccessControlService();
