import { asyncHandler } from "../../utils/asyncHandler";
import { accessControlService } from "../../core/access-control";
import { permissionManagementService } from "../../core/access-control/permission-management.service";
import { ok } from "../../shared/api/success";
import { unauthorized } from "../../shared/api/errors/error-helpers";
import { scanSchemaForAdmin } from "./access-control.service";

export const accessibleCatalogController = asyncHandler(async (req, res) => {
    if (!req.auth) throw unauthorized();
    return ok(
        res,
        undefined,
        await accessControlService.getAccessibleCatalog(req.auth),
    );
});
export const listPermissionsController = asyncHandler(async (req, res) => {
    if (!req.auth) throw unauthorized();
    return ok(
        res,
        undefined,
        await permissionManagementService.list(
            {
                subjectType: req.params.subjectType,
                subjectId: Number(req.params.subjectId),
            },
            req.auth,
        ),
    );
});
export const changePermissionsController = asyncHandler(async (req, res) => {
    if (!req.auth) throw unauthorized();
    return ok(
        res,
        undefined,
        await permissionManagementService.change(
            req.body,
            req.auth,
            req.requestId ?? null,
        ),
    );
});
export const scanSchemaController = asyncHandler(async (req, res) => {
    if (!req.auth) throw unauthorized();
    return ok(res, undefined, await scanSchemaForAdmin(req.auth));
});
