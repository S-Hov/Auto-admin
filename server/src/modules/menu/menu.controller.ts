import { asyncHandler } from "../../utils/asyncHandler";
import { ok } from "../../shared/api/success";
import { menuService } from "./menu.service";
import type { MenuSaveData, MenuPermissionData, MenuDeleteParams, MenuResolveParams, MenuResolveIdParams } from "@auto-admin/contracts/menu";

export const resolveMenuByIdController = asyncHandler(async (req, res) => {
    const { id } = res.locals.validatedParams as MenuResolveIdParams;
    return ok(res, undefined, await menuService.resolveId(id, req.auth!));
});

export const resolveMenuController = asyncHandler(async (req, res) => {
    const { slug } = res.locals.validatedParams as MenuResolveParams;
    return ok(res, undefined, await menuService.resolveSlug(slug, req.auth!));
});

export const getMenuController = asyncHandler(async (req, res) => {
    return ok(res, undefined, await menuService.getMenu(req.auth!));
});
export const getManageableMenuController = asyncHandler(async (req, res) => {
    return ok(res, undefined, await menuService.getManageableMenu(req.auth!));
});
export const saveMenuController = asyncHandler(async (req, res) => {
    const data: MenuSaveData = req.body;
    return ok(
        res,
        undefined,
        await menuService.save(data, req.auth!, req.requestId ?? null),
    );
});
export const deleteMenuController = asyncHandler(async (req, res) => {
    const { id }: MenuDeleteParams = res.locals.validatedParams;
    return ok(
        res,
        undefined,
        await menuService.delete(
            id,
            req.auth!,
            req.requestId ?? null,
        ),
    );
});
export const menuPermissionsController = asyncHandler(async (req, res) => {
    const data: MenuPermissionData = req.body;
    return ok(
        res,
        undefined,
        await menuService.changePermissions(
            data,
            req.auth!,
            req.requestId ?? null,
        ),
    );
});
