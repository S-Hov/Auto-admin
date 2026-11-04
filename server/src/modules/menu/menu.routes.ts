import { Router } from "express";
import { requireAdmin, requireAuth } from "../../shared/middleware/auth.middleware";
import { validate } from '../../shared/middleware/validate';
import { menuSaveSchema, menuPermissionSchema, menuDeleteParamsSchema, menuResolveParamsSchema, menuResolveIdParamsSchema } from "@auto-admin/contracts/menu";
import { createRateLimiter } from "../../shared/middleware/rateLimiter";
import { deleteMenuController, getManageableMenuController, getMenuController, menuPermissionsController, saveMenuController, resolveMenuController, resolveMenuByIdController } from "./menu.controller";

const menuRouter = Router();
menuRouter.use(requireAuth, createRateLimiter({ limit: 120, windowMs: 60_000 }));
menuRouter.get("/", getMenuController);
menuRouter.get('/resolve/:slug', validate(menuResolveParamsSchema, 'params'), resolveMenuController);
menuRouter.get("/manage", requireAdmin, getManageableMenuController);
menuRouter.get('/:id', validate(menuResolveIdParamsSchema, 'params'), resolveMenuByIdController);
menuRouter.use(requireAdmin);
menuRouter.post("/", validate(menuSaveSchema), saveMenuController);
menuRouter.delete("/:id", validate(menuDeleteParamsSchema, 'params'), deleteMenuController);
menuRouter.put("/permissions", validate(menuPermissionSchema), menuPermissionsController);
export default menuRouter;
