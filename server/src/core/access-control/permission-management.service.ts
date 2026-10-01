import { databaseRuntime } from "../../db/runtime/database.runtime";
import type { DatabaseProvider } from "../../db/contracts/provider.interface";
import type { AccessControlProvider } from "./contracts/access-control-provider.interface";
import type { AccessPrincipal } from "./contracts/access-control.types";
import { getActiveAccessControlProvider } from "./runtime/access-control.runtime";
import { requireSystemAdmin } from "./policy/require-system-admin";
import {
    parsePermissionChange,
    permissionSubjectSchema,
} from "./schema/permission.schema";
import { badRequest, forbidden } from "../../shared/api/errors/error-helpers";
import { ERROR_CODES } from "../../shared/api/codes/error-codes";

export class PermissionManagementService {
    constructor(
        private readonly configuredDatabaseProvider?: DatabaseProvider,
        private readonly configuredAccessProvider?: AccessControlProvider,
    ) {}

    private providers() {
        return {
            database:
                this.configuredDatabaseProvider ??
                databaseRuntime.getProvider(),
            access:
                this.configuredAccessProvider ??
                getActiveAccessControlProvider(),
        };
    }

    async change(
        input: unknown,
        principal: AccessPrincipal,
        requestId: string | null = null,
    ) {
        requireSystemAdmin(principal);
        const change = parsePermissionChange(input);
        const { database, access } = this.providers();
        return database.transaction(async (executor) => {
            const repository = access.createRepository(executor);
            if (
                !(await repository.isActiveSystemAdminForUpdate(
                    principal.userId,
                ))
            ) {
                throw forbidden(ERROR_CODES.ACCESS_ADMIN_REQUIRED);
            }
            if (
                !(await repository.subjectExists(
                    change.subjectType,
                    change.subjectId,
                ))
            ) {
                throw badRequest(ERROR_CODES.ACCESS_PERMISSION_TARGET_INVALID);
            }
            const target = await repository.getTargetForUpdate(change);
            if (
                !target ||
                target.resourceState !== "present" ||
                target.fieldState === "missing" ||
                target.isServiceTable ||
                target.tableName.toLowerCase().startsWith("auto_admin__") ||
                (target.resourceType === "view" && change.action !== "read")
            ) {
                throw badRequest(ERROR_CODES.ACCESS_PERMISSION_TARGET_INVALID);
            }
            const previousEffect =
                await repository.getPermissionForUpdate(change);
            if (previousEffect === change.effect) return { changed: false };
            await repository.setPermission(change);
            await repository.appendAudit(
                change,
                previousEffect,
                principal.userId,
                requestId?.slice(0, 64) ?? null,
            );
            // This API never modifies users or system roles. Data rules cannot demote an admin.
            return { changed: true };
        });
    }

    async list(input: unknown, principal: AccessPrincipal) {
        requireSystemAdmin(principal);
        const parsed = permissionSubjectSchema.safeParse(input);
        if (!parsed.success)
            throw badRequest(ERROR_CODES.COMMON_VALIDATION_FAILED);
        const { database, access } = this.providers();
        return database.transaction(async (executor) => {
            const repository = access.createRepository(executor);
            if (
                !(await repository.isActiveSystemAdminForUpdate(
                    principal.userId,
                ))
            )
                throw forbidden(ERROR_CODES.ACCESS_ADMIN_REQUIRED);
            if (
                !(await repository.subjectExists(
                    parsed.data.subjectType,
                    parsed.data.subjectId,
                ))
            ) {
                throw badRequest(ERROR_CODES.ACCESS_PERMISSION_TARGET_INVALID);
            }
            return repository.listPermissions(
                parsed.data.subjectType,
                parsed.data.subjectId,
            );
        });
    }
}

export const permissionManagementService = new PermissionManagementService();
