import { asyncHandler } from "../../utils/asyncHandler";
import { unauthorized } from "../../shared/api/errors/error-helpers";
import { ok } from "../../shared/api/success";
import { menuService } from "./menu.service";

export const getMenuController = asyncHandler(async (req, res) => {
    if (!req.auth) throw unauthorized();
    return ok(res, undefined, await menuService.getMenu(req.auth));
});
export const getManageableMenuController = asyncHandler(async (req, res) => {
    if (!req.auth) throw unauthorized();
    return ok(res, undefined, await menuService.getManageableMenu(req.auth));
});
export const saveMenuController = asyncHandler(async (req, res) => {
    if (!req.auth) throw unauthorized();
    return ok(
        res,
        undefined,
        await menuService.save(req.body, req.auth, req.requestId ?? null),
    );
});
export const deleteMenuController = asyncHandler(async (req, res) => {
    if (!req.auth) throw unauthorized();
    return ok(
        res,
        undefined,
        await menuService.delete(
            Number(req.params.id),
            req.auth,
            req.requestId ?? null,
        ),
    );
});
export const menuPermissionsController = asyncHandler(async (req, res) => {
    if (!req.auth) throw unauthorized();
    return ok(
        res,
        undefined,
        await menuService.changePermissions(
            req.body,
            req.auth,
            req.requestId ?? null,
        ),
    );
});
