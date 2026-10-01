import type { AccessPrincipal } from "../../core/access-control";
import { requireSystemAdmin } from "../../core/access-control/policy/require-system-admin";
import { getActiveAccessControlProvider } from "../../core/access-control/runtime/access-control.runtime";
import { databaseRuntime } from "../../db/runtime/database.runtime";
import { schemaCatalogService } from "../../core/schema-catalog";
import { SchemaCatalogScanInProgressError } from "../../core/schema-catalog/schema-catalog.errors";
import { conflict, forbidden } from "../../shared/api/errors/error-helpers";
import { ERROR_CODES } from "../../shared/api/codes/error-codes";

export async function scanSchemaForAdmin(principal: AccessPrincipal) {
    requireSystemAdmin(principal);
    const active = await databaseRuntime
        .getProvider()
        .transaction((executor) =>
            getActiveAccessControlProvider()
                .createRepository(executor)
                .isActiveSystemAdminForUpdate(principal.userId),
        );
    if (!active) throw forbidden(ERROR_CODES.ACCESS_ADMIN_REQUIRED);
    try {
        const scan = await schemaCatalogService.scan(principal.userId);
        return {
            scanId: scan.scanId,
            fingerprint: scan.fingerprint,
            counts: scan.counts,
        };
    } catch (error) {
        if (error instanceof SchemaCatalogScanInProgressError)
            throw conflict(ERROR_CODES.COMMON_CONFLICT);
        throw error;
    }
}
